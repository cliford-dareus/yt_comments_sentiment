'use client'

import { ReactNode } from "react"
import { Button } from "./ui/button"
import { GoogleOauthReturnType } from "@/app/auth/action";

type AuthButtonProps = {
  provider: 'google' | 'github';
  oauthFn: () => GoogleOauthReturnType
}


const AuthButton = ({ provider, oauthFn }: AuthButtonProps) => {
  return (
    <Button className=""
      onClick={async () => {
        const response = await oauthFn()

        if (response.url) {
          window.location.href = response.url
        } else {
          console.log('Error')
        }
      }}>
      Continue with {provider}
    </Button>
  )
};

export default AuthButton;