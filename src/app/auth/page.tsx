import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthGoogleButton } from "./google-button";

const Page = async () => {
  const user = await getUser();

  if (user) {
    return redirect("/dashboard");
  }

  return (
    <div className="container mx-auto flex h-full items-center justify-center">
      <div className="flex flex-col w-[300px] mx-auto md:w-[50%] md:min-w-[50%] lg:min-w-[420px] lg:w-[420px]">
        <span className="text-white font-bold text-2xl mb-6">Comment.ai</span>
        <div className="p-8 bg-slate-100 rounded-xl space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
            <p className="text-sm text-slate-600 mt-1">
              Continue with Google to analyze your YouTube comments.
            </p>
          </div>

          <AuthGoogleButton />

          <p className="text-xs text-slate-500 text-center">
            By continuing you agree to use this app for personal comment analysis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Page;
