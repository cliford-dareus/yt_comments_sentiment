"use server";

import { getUser } from "@/lib/lucia";

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
    const response = await fetch(
      "http://localhost:3000/api/analyze-sentiment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name, chatId }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to analyze sentiment");
    }

    const result = await response.json();
    console.log(result)
    return result;
  } catch (err) {}
};
