import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createObjectCsvWriter } from 'csv-writer';
import { generateCSV } from "@/lib/utils";
import { uploadToSupabase } from "@/lib/supabase-bucket";
import { lucia } from "@/lib/lucia";
import { db } from "@/lib/db";
import { $user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export  async function POST (req: Request) {
  const { videoId , sessionId } = await req.json();
  
  if(!sessionId){
    return null
  };
  
  const { session, user } = await lucia.validateSession(sessionId);
  
  if (!user){
    return null
  }

  const userId = await db.select({
    id: $user.id,
  }).from($user).where(eq($user.id, user.id));
  
  if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }
  
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
  
    try {
      const comments = [];
      let pageToken = '';
  
      do {
        const response = await youtube.commentThreads.list({
          part: ['snippet'],
          videoId: videoId,
          maxResults: 100,
          pageToken: pageToken
        });
  
        comments.push(...response.data.items!);
        pageToken = response?.data.nextPageToken!;
      } while (pageToken);
      
      // generate csv from content
      const records = comments.map((comment) => {
        return comment.snippet?.topLevelComment?.snippet?.textDisplay
      }) as string[];
      
      const csvContent = await generateCSV(records);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Save the file to a bucket 
      const fileId = await uploadToSupabase(comments[0].snippet?.videoId!, blob, userId[0].id);
      console.log(fileId)
      // Turn the file into embedding vector 
     
      // Save a record in db
      
      return NextResponse.json({blob}, {status: 200})
    } catch (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
            { error: "internal server error" },
            { status: 500 }
          );
    }  
  return NextResponse.json({message: 'RECEIVED'})
};