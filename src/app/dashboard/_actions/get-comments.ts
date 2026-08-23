"use server";

import { getUser } from "@/lib/auth";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const uploadYtToSupabase = async (videoId: { videoId: string }) => {
  const user = await getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const userId = user.id;

  try {
    const res = await fetch(`${getBaseUrl()}/api/youtube-comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, userId }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data?.error ?? "Failed to fetch comments" };
    }

    return data;
  } catch (error) {
    console.error("uploadYtToSupabase error:", error);
    return { error: "Something went wrong while fetching comments" };
  }
};

export default uploadYtToSupabase;
