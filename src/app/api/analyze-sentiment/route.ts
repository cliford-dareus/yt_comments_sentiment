import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { $sentiment } from "@/lib/db/schema";

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export async function POST(req: Request) {
    try {
        const { file_name, chatId } = await req.json();

        if (!file_name || !chatId) {
            return NextResponse.json(
                { error: "file_name and chatId are required" },
                { status: 400 },
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!,
        );

        const { data, error } = await supabase.storage
            .from("yt_comment_bucket")
            .download(file_name);

        if (error || !data) {
            return NextResponse.json(
                { error: "Could not download file from Supabase" },
                { status: 400 },
            );
        }

        const csv = await data.text();

        // Keep the prompt reasonably sized
        const lines = csv.split("\n").filter(Boolean);
        const sample = lines.slice(0, 151).join("\n");

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

        const result = await genAI.interactions.create({
            model: "gemini-3.7-flash",
            input: prompt,
        });
        const analysis = result.output_text;

        await db.insert($sentiment).values({
            id: crypto.randomUUID(),
            chatId,
            content: analysis,
        });

        return NextResponse.json({ analysis });
    } catch (error) {
        console.error("Error analyzing sentiment:", error);
        return NextResponse.json(
            { error: "Failed to analyze sentiment" },
            { status: 500 },
        );
    }
}
