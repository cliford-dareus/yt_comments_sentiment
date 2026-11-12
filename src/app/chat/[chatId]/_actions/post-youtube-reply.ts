"use server";

import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { $chats, $comments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

async function resolveAccessToken(): Promise<{
  token: string | null;
  needsReconnect: boolean;
}> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { token: null, needsReconnect: true };
  }

  // next-auth/jwt getToken needs the request cookies
  const cookieStore = cookies();
  const token = await getToken({
    // @ts-expect-error next-auth accepts a minimal req with cookies
    req: { cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])) },
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return { token: null, needsReconnect: true };
  }

  let access = token.googleAccessToken as string | undefined;
  const refresh = token.googleRefreshToken as string | undefined;
  const expiresAt = (token.googleExpiresAt as number | undefined) ?? 0;
  const hasScope = Boolean(token.youtubeScope);

  if (!hasScope && !access) {
    return { token: null, needsReconnect: true };
  }

  if ((!access || Date.now() / 1000 > expiresAt - 60) && refresh) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID ?? "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          grant_type: "refresh_token",
          refresh_token: refresh,
        }),
      });
      const data = (await res.json()) as {
        access_token?: string;
        error?: string;
      };
      if (res.ok && data.access_token) {
        access = data.access_token;
      } else {
        console.error("reply token refresh failed:", data.error);
        return { token: null, needsReconnect: true };
      }
    } catch (err) {
      console.error("reply token refresh error:", err);
      return { token: null, needsReconnect: true };
    }
  }

  if (!access) {
    return { token: null, needsReconnect: true };
  }

  return { token: access, needsReconnect: false };
}

/**
 * Post the draft text as a reply under the original YouTube comment.
 * Requires Google sign-in with youtube.force-ssl (re-login if needed).
 */
export async function postYoutubeReply({
  chatId,
  commentId,
  text,
}: {
  chatId: string;
  commentId: string;
  text: string;
}) {
  const user = await getUser();
  if (!user) return { error: "Unauthorized" };

  const body = text.trim();
  if (!body) return { error: "Reply cannot be empty" };
  if (body.length > 10000) {
    return { error: "Reply is too long for YouTube (max ~10,000 characters)" };
  }

  const chatRows = await db
    .select()
    .from($chats)
    .where(and(eq($chats.id, chatId), eq($chats.userId, user.id)))
    .limit(1);

  if (!chatRows.length) return { error: "Chat not found" };

  const commentRows = await db
    .select()
    .from($comments)
    .where(and(eq($comments.id, commentId), eq($comments.chatId, chatId)))
    .limit(1);

  const comment = commentRows[0];
  if (!comment) return { error: "Comment not found" };

  if (!comment.youtubeCommentId) {
    return {
      error:
        "This comment has no YouTube id — it can’t be replied to via the API.",
    };
  }

  const { token, needsReconnect } = await resolveAccessToken();
  if (!token) {
    return {
      error: needsReconnect
        ? "Connect YouTube: sign out and sign in again, then approve YouTube access. Use the Google account that owns the channel."
        : "Missing Google access token",
      needsReconnect: true as const,
    };
  }

  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2.setCredentials({ access_token: token });

    const youtube = google.youtube({ version: "v3", auth: oauth2 });

    const res = await youtube.comments.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          parentId: comment.youtubeCommentId,
          textOriginal: body,
        },
      },
    });

    const replyId = res.data.id ?? null;

    // Persist draft + mark triage done
    await db
      .update($comments)
      .set({
        replyDraft: body,
        triageStatus: "done",
      })
      .where(eq($comments.id, commentId));

    return {
      ok: true as const,
      replyId,
      youtubeCommentId: comment.youtubeCommentId,
      videoId: chatRows[0].videoId,
    };
  } catch (err: unknown) {
    console.error("postYoutubeReply failed:", err);

    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : "Failed to post reply on YouTube";

    // Common API messages → clearer UX
    if (/insufficientPermissions|insufficient authentication|403/i.test(message)) {
      return {
        error:
          "YouTube denied the reply. Sign out and sign in with the channel owner account, and approve YouTube access.",
        needsReconnect: true as const,
      };
    }
    if (/commentsDisabled|processingFailure/i.test(message)) {
      return { error: "Comments are disabled or this thread can’t accept replies." };
    }

    return { error: message.slice(0, 240) };
  }
}
