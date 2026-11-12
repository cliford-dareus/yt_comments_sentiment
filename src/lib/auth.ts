import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";
import { $user } from "./db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "online",
          response_type: "code",
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
    /**
     * Returning false → NextAuth redirects to /auth?error=AccessDenied.
     * Only reject when we truly cannot create/load the user.
     */
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
        // Most common production cause of AccessDenied: DATABASE_URL / schema
        console.error("signIn callback DB error (causes AccessDenied):", error);
        return false;
      }
    },

    async jwt({ token, user, trigger }) {
      // First sign-in or missing userId — resolve from DB
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

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? "";
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;
      }
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
