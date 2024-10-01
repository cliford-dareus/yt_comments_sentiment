"use server";

import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";
import { deleteVectorInPinecone } from "@/lib/pinecone";
import { supabase_bucket } from "@/lib/supabase-bucket";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

export const deleteChat = async (chatId: string) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  try {
    const file = await db
      .delete($chats)
      .where(eq($chats.id, chatId))
      .returning();

    if (file.length == 0) {
      return;
    }

    const { data, error } = await supabase.storage
      .from("yt_comment_bucket")
      .remove([file[0].fileName!]);

    if (error) {
      return;
    }

    await deleteVectorInPinecone({ file_name: file[0].fileName! });
    return { status: "Chat deleted" };
  } catch (err) {}
};
