import AuthButton from "@/components/auth-button";
import { getGoogleOauth } from "./action";
import { getUser } from "@/lib/lucia";
import { redirect } from "next/navigation";
import AuthTabSwitcher from "@/components/auth-tabs-switcher";
import SignInForm from "./sign-in-form";
import SignUpForm from "./sign-up-form";

const Page = async () => {
  const user = await getUser();

  if (user) {
    return redirect('/dashboard')
  };

  return (
    <div className="container mx-auto">
      <div className="h-full w-full">
        <div className="flex flex-col  w-[300px] mx-auto md:w-[50%] md:min-w-[50%] lg:min-w-[540px] lg:w-[540px]">
          <span className="text-white font-bold text-2xl">Comment.ai</span>
          <div className="h-[500px] p-8 bg-slate-100 rounded-xl">
            <AuthTabSwitcher signUp={<SignUpForm />} signIn={<SignInForm />} />
            <AuthButton provider="github" oauthFn={async () => {
              'use server'
              return { success: false, url: '' }
            }
            } />
            <AuthButton provider="google" oauthFn={getGoogleOauth} />
          </div>
        </div>
      </div>
    </div>
  )
};

export default Page;



