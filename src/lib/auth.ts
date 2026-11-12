import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";
import { $user } from "./db/schema";
import { eq } from "drizzle-orm";

const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";

async function refreshGoogleAccessToken(token: {
  googleRefreshToken?: string;
  googleAccessToken?: string;
  googleExpiresAt?: number;
  youtubeScope?: boolean;
}) {
  if (!token.googleRefreshToken) {
    return token;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.googleRefreshToken,
      }),
    });

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (!res.ok || !data.access_token) {
      console.error("Google token refresh failed:", data.error ?? res.status);
      return {
        ...token,
        googleAccessToken: undefined,
        googleExpiresAt: undefined,
        youtubeScope: false,
      };
    }

    return {
      ...token,
      googleAccessToken: data.access_token,
      googleExpiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      youtubeScope: true,
    };
  } catch (err) {
    console.error("Google token refresh error:", err);
    return token;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          // offline + consent once so we can refresh and post replies
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            YOUTUBE_SCOPE,
          ].join(" "),
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) {
        console.error(
          "signIn rejected: Google account has no email on the profile",
        );
        return false;
      }

      try {
        const existing = await db
          .select()
          .from($user)
          .where(eq($user.email, email))
          .limit(1);

        if (existing.length === 0) {
          await db.insert($user).values({
            id: crypto.randomUUID(),
            email,
            fullName: user.name ?? profile?.name ?? "",
            picture: user.image ?? "",
          });
        } else {
          await db
            .update($user)
            .set({
              fullName: user.name ?? existing[0].fullName,
              picture: user.image ?? existing[0].picture,
            })
            .where(eq($user.email, email));
        }

        return true;
      } catch (error) {
        console.error("signIn callback DB error (causes AccessDenied):", error);
        return false;
      }
    },

    async jwt({ token, user, account, trigger }) {
      // Fresh OAuth sign-in — capture tokens
      if (account) {
        token.googleAccessToken = account.access_token;
        if (account.refresh_token) {
          token.googleRefreshToken = account.refresh_token;
        }
        token.googleExpiresAt = account.expires_at;
        const scope = account.scope ?? "";
        token.youtubeScope = scope.includes("youtube.force-ssl") || scope.includes("youtube");
      }

      if (user?.email || (token.email && !token.userId) || trigger === "update") {
        const email = (
          user?.email ?? (token.email as string | undefined) ?? ""
        )
          .trim()
          .toLowerCase();
        if (email) {
          try {
            const rows = await db
              .select({ id: $user.id })
              .from($user)
              .where(eq($user.email, email))
              .limit(1);

            if (rows[0]) {
              token.userId = rows[0].id;
            }
          } catch (err) {
            console.error("jwt callback DB error:", err);
          }
        }
      }

      if (user?.name) token.name = user.name;
      if (user?.picture || user?.image) {
        token.picture = (user as { image?: string }).image ?? token.picture;
      }

      // Refresh access token if expired (or about to)
      const expiresAt = token.googleExpiresAt ?? 0;
      if (
        token.googleRefreshToken &&
        expiresAt &&
        Date.now() / 1000 > expiresAt - 60
      ) {
        const refreshed = await refreshGoogleAccessToken(token);
        Object.assign(token, refreshed);
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? "";
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      session.hasYoutubeAccess = Boolean(
        token.youtubeScope &&
          (token.googleAccessToken || token.googleRefreshToken),
      );
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // ignore
      }
      return `${baseUrl}/dashboard`;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  picture: string | null;
};

/**
 * Session user for the app. Returns null if unauthenticated.
 */
export async function getUser(): Promise<AppUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const userId = session.user.id;
  const email = session.user.email.trim().toLowerCase();

  try {
    const rows = await db
      .select({
        id: $user.id,
        email: $user.email,
        fullName: $user.fullName,
        picture: $user.picture,
      })
      .from($user)
      .where(userId ? eq($user.id, userId) : eq($user.email, email))
      .limit(1);

    if (rows[0]) {
      return rows[0];
    }
  } catch (err) {
    console.error("getUser DB error:", err);
  }

  return {
    id: userId ?? "",
    email,
    fullName: session.user.name ?? "",
    picture: session.user.image ?? "",
  };
}

/** Throws when page already redirects on null. */
export async function requireUser(): Promise<AppUser> {
  const user = await getUser();
  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * Google access token for YouTube Data API calls (replies).
 * Refreshes via JWT callback when near expiry.
 */
export async function getGoogleAccessToken(): Promise<{
  accessToken: string | null;
  hasYoutubeScope: boolean;
}> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { accessToken: null, hasYoutubeScope: false };
  }

  // Re-read JWT-backed session; access token is not on session object by design
  // so we pull from getToken pattern via a second getServerSession after jwt refresh.
  // NextAuth doesn't expose token on session — use getToken from next-auth/jwt in callers.
  return {
    accessToken: null,
    hasYoutubeScope: Boolean(session.hasYoutubeAccess),
  };
}
