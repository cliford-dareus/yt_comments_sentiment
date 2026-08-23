"use server";

/**
 * @deprecated Use next-auth signIn("google") from the client instead.
 */
export async function getGoogleOauth() {
  return {
    success: false,
    url: "",
    error: "Deprecated. Use NextAuth signIn('google').",
  };
}

export type GoogleOauthReturnType = ReturnType<typeof getGoogleOauth>;
