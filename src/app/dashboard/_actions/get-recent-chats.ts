'use server'

import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";


const getRecentChats = async (userId: string) => {
  try {
    const chats = await db.select()
      .from($chats)
      .limit(4)
      .where(eq($chats.userId, userId));
    
    return chats
  }catch (error){
    
  }
}

export default getRecentChats;