'use server'

import { cookies } from "next/headers";
import { googleOauthClient } from "@/lib/oauth";
import { generateCodeVerifier, generateState } from "arctic";

// Authenticate with google
export const getGoogleOauth = async () => {
  try {
    const state = generateState()
    const codeVerifier = generateCodeVerifier()
   
    cookies().set('codeVerifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    cookies().set('state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    const authUrl = await googleOauthClient.createAuthorizationURL(state, codeVerifier, {
      scopes: ['email', 'profile']
    })
    
    return { success: true, url: authUrl.toString() }
  } catch (err) {
    return { success: false, error: 'Something went wrong' }
  }
};

export const getGithubOauth = async () => { };

export type GoogleOauthReturnType = ReturnType<typeof getGoogleOauth>