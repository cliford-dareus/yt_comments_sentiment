import AuthButton from "@/components/auth-button";
import { getGoogleOauth } from "./action";

const Page = () => {
  return (
    <div className="">
      AUTH PAGE
      
      <AuthButton provider="github" oauthFn={async () => {
        'use server'
        return { success: false, url: '' } }
      } />
      <AuthButton provider="google" oauthFn={getGoogleOauth}/>
    </div>
  )
}

export default Page;