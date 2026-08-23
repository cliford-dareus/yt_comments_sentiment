import { NextResponse } from "next/server";

/**
 * Legacy Lucia + Arctic Google callback.
 * Auth is now handled by NextAuth at /api/auth/[...nextauth].
 * This route redirects any leftover traffic to the NextAuth sign-in flow.
 */
export async function GET() {
  return NextResponse.redirect(
    new URL("/api/auth/signin/google", process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  );
}
