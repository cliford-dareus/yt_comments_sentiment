"use server";

import { getUser } from "@/lib/lucia";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { $sentiment } from "@/lib/db/schema";
import { pipeline } from "@huggingface/transformers";

export const getSentimentToChat = async ({
  file_name,
  chatId,
}: {
  file_name: string;
  chatId: string;
}) => {
  const user = await getUser();

  if (!user) {
    return null;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data, error } = await supabase.storage
      .from("yt_comment_bucket")
      .download(file_name);

    const csv = await data?.text();

    if (error) {
      return null;
    }

    const classifier = await pipeline("sentiment-analysis");
    const analysis = await classifier("I love transformers!");

    const sentiment = await db.insert($sentiment).values({
      id: await crypto.randomUUID(),
      chatId,
      content: analysis,
    });
  } catch (err) {}
};
