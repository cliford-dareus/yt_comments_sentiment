"use server";

import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  enrichThemesAndTriage,
  setTriageStatus,
} from "@/lib/themes-and-triage";

async function assertChatOwner(chatId: string) {
  const user = await getUser();
  if (!user) return { error: "Unauthorized" as const };

  const rows = await db
    .select({ id: $chats.id })
    .from($chats)
    .where(and(eq($chats.id, chatId), eq($chats.userId, user.id)))
    .limit(1);

  if (!rows.length) return { error: "Chat not found" as const };
  return { user };
}

export async function updateTriageStatusAction(params: {
  chatId: string;
  commentId: string;
  status: "open" | "drafted" | "done" | "skipped";
}) {
  const auth = await assertChatOwner(params.chatId);
  if ("error" in auth && auth.error) return { error: auth.error };

  await setTriageStatus(params);
  return { ok: true as const };
}

export async function rerunThemesAndTriageAction(chatId: string) {
  const auth = await assertChatOwner(chatId);
  if ("error" in auth && auth.error) return { error: auth.error };

  try {
    const result = await enrichThemesAndTriage(chatId);
    return { ok: true as const, result };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to rebuild themes",
    };
  }
}
