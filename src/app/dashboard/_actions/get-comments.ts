"use server"

import { lucia } from "@/lib/lucia";
import { cookies } from "next/headers";


const getComments = async (videoId: { videoId: string }) => {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value || null

  try {
    const data = await fetch('http://localhost:3000/api/youtube-comments', {
      method: 'POST',
      body: JSON.stringify({ videoId , sessionId})
    })
    const response = await data.json()
    return response
  } catch (error) {
    console.log("Something went wrong")
  }
};

export default getComments;