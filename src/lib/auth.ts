import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";
import { $user } from "./db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
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
          // Keep profile fields reasonably up to date
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

    async jwt({ token, user }) {
      // On first sign-in, resolve our internal user id from the DB
      if (user?.email) {
        const rows = await db
          .select({ id: $user.id })
          .from($user)
          .where(eq($user.email, user.email))
          .limit(1);

        if (rows[0]) {
          token.userId = rows[0].id;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Drop-in replacement for the old Lucia getUser().
 * Returns the same shape: { id, email, fullName, picture } | null
 */
export async function getUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const userId = (session.user as { id?: string }).id;

  // Prefer DB row so we always return the canonical id + fields
  const rows = await db
    .select({
      id: $user.id,
      email: $user.email,
      fullName: $user.fullName,
      picture: $user.picture,
    })
    .from($user)
    .where(
      userId
        ? eq($user.id, userId)
        : eq($user.email, session.user.email),
    )
    .limit(1);

  if (rows[0]) {
    return rows[0];
  }

  // Fallback from session if DB lookup fails
  return {
    id: userId ?? "",
    email: session.user.email,
    fullName: session.user.name ?? "",
    picture: session.user.image ?? "",
  };
}
