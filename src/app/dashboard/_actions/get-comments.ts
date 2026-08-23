"use server";

import { getUser } from "@/lib/lucia";

const uploadYtToSupabase = async (videoId: { videoId: string }) => {
  const user = await getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const userId = user.id;

  try {
    // Use relative URL so it works in any environment (dev / prod)
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/youtube-comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, userId }),
        // credentials not needed for same-origin server action -> route
      },
    );

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
