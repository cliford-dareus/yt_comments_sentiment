import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { $sentiment } from "@/lib/db/schema";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: Request) {
  const { file_name, chatId } = await req.json();

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await supabase.storage
    .from("yt_comment_bucket")
    .download(file_name);

  const csv = await data?.text();

  if (error) {
    return NextResponse.json(
      { error: "Couldnt download file from supabase..." },
      { status: 400 },
    );
  }

  try {
    const prompt = `Perform sentiment analysis on the following CSV data:\n\n${data}\n\nProvide a summary of the sentiment analysis results.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();
    console.log(analysis);

    // Todo :  add to sentiment table
    const sentiment = await db.insert($sentiment).values({
      id: await crypto.randomUUID(),
      chatId,
      content: analysis,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return NextResponse.json({ error: "Failed to analyze sentiment" });
  }
}
