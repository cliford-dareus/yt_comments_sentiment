"use server";

import { getUser } from "@/lib/lucia";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { $sentiment } from "@/lib/db/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export const getSentimentToChat = async ({
  file_name,
  chatId,
}: {
  file_name: string;
  chatId: string;
}) => {
  const user = await getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!file_name || !chatId) {
    return { error: "file_name and chatId are required" };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data, error } = await supabase.storage
      .from("yt_comment_bucket")
      .download(file_name);

    if (error || !data) {
      console.error("Supabase download error:", error);
      return { error: "Could not download comments file" };
    }

    const csv = await data.text();

    // Limit payload size sent to the model (keep roughly first ~150 comments worth)
    const lines = csv.split("\n").filter(Boolean);
    const sample = lines.slice(0, 151).join("\n"); // header + up to 150 rows

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert at analyzing YouTube comment sections.

Below is a CSV of top-level comments (header "Value" followed by one comment per line).

Perform a clear, structured sentiment analysis:

1. Overall sentiment (Positive / Mixed / Negative) with a rough percentage breakdown.
2. Key themes or topics people are talking about.
3. Notable praise and notable criticism (quote a few short examples if useful).
4. Any recurring questions, requests, or calls to action from the audience.
5. One-sentence takeaway for the creator.

Keep the response concise and actionable. Do not invent comments that are not present.

CSV data:
${sample}`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    await db.insert($sentiment).values({
      id: crypto.randomUUID(),
      chatId,
      content: analysis,
    });

    return { analysis };
  } catch (err) {
    console.error("Error in getSentimentToChat:", err);
    return { error: "Failed to analyze sentiment" };
  }
};
