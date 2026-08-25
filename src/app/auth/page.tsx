import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthGoogleButton } from "./google-button";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Auth is misconfigured (check GOOGLE_CLIENT_ID / SECRET and NEXTAUTH_SECRET).",
  AccessDenied: "Access was denied. Try another Google account.",
  Verification: "The sign-in link is no longer valid. Try again.",
  OAuthSignin: "Could not start Google sign-in. Try again.",
  OAuthCallback: "Google sign-in failed during callback. Try again.",
  OAuthCreateAccount: "Could not create your account. Try again.",
  EmailCreateAccount: "Could not create your account. Try again.",
  Callback: "Sign-in callback failed. Try again.",
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method.",
  EmailSignin: "Could not send the sign-in email.",
  CredentialsSignin: "Invalid credentials.",
  SessionRequired: "Please sign in to continue.",
  Default: "Something went wrong signing in. Please try again.",
};

const Page = async ({
  searchParams,
}: {
  searchParams?: { error?: string; callbackUrl?: string };
}) => {
  const user = await getUser();

  if (user) {
    const dest =
      searchParams?.callbackUrl && searchParams.callbackUrl.startsWith("/")
        ? searchParams.callbackUrl
        : "/dashboard";
    return redirect(dest);
  }

  const errorKey = searchParams?.error;
  const errorMessage = errorKey
    ? ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.Default
    : null;

  const callbackUrl =
    searchParams?.callbackUrl && searchParams.callbackUrl.startsWith("/")
      ? searchParams.callbackUrl
      : "/dashboard";

  return (
    <div className="container mx-auto flex h-full items-center justify-center px-4">
      <div className="flex flex-col w-full max-w-[420px]">
        <span className="text-white font-bold text-2xl mb-6 tracking-tight">
          Comment.ai
        </span>

        <div className="p-8 bg-white rounded-2xl shadow-xl space-y-6 border border-slate-200/60">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Sign in to continue
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Analyze comment sentiment, triage replies, and track channel
              trends — all in one place.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            >
              {errorMessage}
            </div>
          )}

          <AuthGoogleButton callbackUrl={callbackUrl} />

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            We only request basic Google profile info to create your account.
            YouTube data is fetched with your API key when you analyze a video.
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Personal comment analysis tool · not affiliated with YouTube
        </p>
      </div>
    </div>
  );
};

export default Page;
