"use server"

import { getUser, lucia } from "@/lib/lucia";
import { cookies } from "next/headers";

const uploadYtToSupabase= async (videoId: { videoId: string }) => {
  const user = await getUser();

  if (!user) {
    return null
  };

  const userId = user.id

  try {
    const data = await fetch('/api/youtube-comments', {
      method: 'POST',
      body: JSON.stringify({ videoId, userId }),
      credentials: "include",
    })
    const response = await data.json();

    return response;
  } catch (error) {
    console.log("Something went wrong")
  }
};

export default uploadYtToSupabase;