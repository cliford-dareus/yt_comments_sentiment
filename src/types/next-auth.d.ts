import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    /** True when JWT holds a usable Google access/refresh token with YouTube scope. */
    hasYoutubeAccess?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
    googleExpiresAt?: number; // epoch seconds
    youtubeScope?: boolean;
  }
}
