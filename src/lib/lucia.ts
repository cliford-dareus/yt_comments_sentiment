import { db } from "./db";
import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { $session, $user } from "./db/schema";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

const adapter = new DrizzlePostgreSQLAdapter(db, $session, $user)

export const lucia = new Lucia(adapter, {
  sessionCookie : {
    name: "yt-comment-feel",
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production"
    }
  }
});

export const getUser = async () => { 
  const sessionId = cookies().get(lucia.sessionCookieName)?.value || null;
  
  if(!sessionId){
    return null
  };
  
  const { session, user } = await lucia.validateSession(sessionId);
  
  if (!user){
    return null
  }
  
  try{
    if(session && session.fresh){
      const sessionCookie = await lucia.createSessionCookie(session.id);
      cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    }
    
    if(!session){
      const sessionCookie = await lucia.createBlankSessionCookie()
      cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
    }
  } catch (error) { };
  
  
  const userData = await db.select({
    id: $user.id,
    picture: $user.picture,
    fullName: $user.fullName,
    email: $user.email
  }).from($user).where(eq($user.id, user.id));
    
  return userData[0]
};