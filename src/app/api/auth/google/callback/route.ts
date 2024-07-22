import { db } from "@/lib/db";
import { $user } from "@/lib/db/schema";
import { lucia } from "@/lib/lucia";
import { googleAuthClient } from "@/lib/oauth";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, res: Response) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!state || !code) {
    return new Response('Invalid Request', { status: 400 });
  };

  const codeVerifier = cookies().get('codeVerifier')?.value;
  const saveState = cookies().get('state')?.value;

  if (!codeVerifier || !saveState) {
    console.error('no code verifier or state')
    return new Response('Invalid Request', { status: 400 })
  }

  if (state !== saveState) {
    console.error('state mismatch')
    return new Response('Invalid Request', { status: 400 })
  }
  
  const { accessToken } = await googleAuthClient.validateAuthorizationCode(code, codeVerifier);
  const googleResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers : {
      Authorization: `Bearer ${accessToken}`
    }
  })
  
  const googleData = (await googleResponse.json()) as {
    id: string,
    email: string,
    name: string,
    picture: string
  }
  
  let userId = '';
  
  const existingUser = await db.select().from($user).where(eq($user.email, googleData.email));
  
  if(existingUser){
    userId = existingUser[0]?.id;
  }else {
    const newUser = await db.insert($user).values({
      // ADD UUID
      id: '',
      email: googleData.email,
      fullName: googleData.name,
      picture: googleData.picture
    }).returning({ id: $user.id });
    
    userId = newUser[0].id
  }
  
  const session = await lucia.createSession(userId, {});
  const sessionCookies = await lucia.createSessionCookie(session.id)
  cookies().set(sessionCookies.name, sessionCookies.value, sessionCookies.attributes);
  
  return redirect('/')
}