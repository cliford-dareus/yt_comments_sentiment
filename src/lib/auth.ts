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
    async signIn({ user, profile }) {
      if (!user.email) return false;

      try {
        const existing = await db
          .select()
          .from($user)
          .where(eq($user.email, user.email))
          .limit(1);

        if (existing.length === 0) {
          await db.insert($user).values({
            id: crypto.randomUUID(),
            email: user.email,
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
            .where(eq($user.email, user.email));
        }

        return true;
      } catch (error) {
        console.error("signIn callback error:", error);
        return false;
      }
    },

    async jwt({ token, user, trigger }) {
      // First sign-in or missing userId — resolve from DB
      if (user?.email || (token.email && !token.userId) || trigger === "update") {
        const email = user?.email ?? (token.email as string | undefined);
        if (email) {
          const rows = await db
            .select({ id: $user.id })
            .from($user)
            .where(eq($user.email, email))
            .limit(1);

          if (rows[0]) {
            token.userId = rows[0].id;
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
      // Relative callback
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Same origin
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

  const rows = await db
    .select({
      id: $user.id,
      email: $user.email,
      fullName: $user.fullName,
      picture: $user.picture,
    })
    .from($user)
    .where(userId ? eq($user.id, userId) : eq($user.email, session.user.email))
    .limit(1);

  if (rows[0]) {
    return rows[0];
  }

  return {
    id: userId ?? "",
    email: session.user.email,
    fullName: session.user.name ?? "",
    picture: session.user.image ?? "",
  };
}

/** Throws redirect-friendly null; use when page already redirects on null. */
export async function requireUser(): Promise<AppUser> {
  const user = await getUser();
  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
