import AuthButton from "@/components/auth-button";
import { getGoogleOauth } from "./action";
import { getUser } from "@/lib/lucia";
import { redirect } from "next/navigation";
import AuthTabSwitcher from "@/components/auth-tabs-switcher";

const Page = async () => {
  const user = await getUser();
  
  if (user) {
    return redirect('/dashboard')
  }
  
  return (
    <div className="container mx-auto">
      <div className="flex h-full justify-center items-center">
        <div className="flex flex-col w-[300px] mx-auto md:w-[50%] md:min-w-[50%] lg:min-w-[450px] lg:w-[450px] p-4 bg-slate-100 rounded-xl">
        <span>Comment.ai</span>
        
        <div className="h-[500px]">
        
        <AuthTabSwitcher />
        <AuthButton provider="github" oauthFn={async () => {
          'use server'
          return { success: false, url: '' } }
        } />
        <AuthButton provider="google" oauthFn={getGoogleOauth}/>
        </div>
       
        </div>
      </div>
    </div>
  )
}

export default Page;