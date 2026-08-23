"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import YtUploadForm, { UploadSchema } from "./upload-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import uploadYtToSupabase from "../_actions/get-comments";
import loadSupabaseToPinecone from "@/lib/pinecone";
import { getSentimentToChat } from "../_actions/get-sentiment-to-chat";

const CreateProjectDialog = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const postComments = async (data: z.infer<typeof UploadSchema>) => {
    setError(null);
    setLoading(true);

    try {
      setStatus("Fetching comments from YouTube...");
      const comments = await uploadYtToSupabase({ videoId: data.videoId });

      if (!comments || comments.error || !comments.file_key || !comments.file_name) {
        setError(comments?.error ?? "Failed to fetch comments. Please check the URL and try again.");
        setLoading(false);
        return;
      }

      setStatus("Analyzing sentiment...");
      const sentimentResult = await getSentimentToChat({
        file_name: comments.file_name,
        chatId: comments.chatId,
      });

      if (sentimentResult?.error) {
        console.warn("Sentiment step failed:", sentimentResult.error);
        // Non-blocking for now – still proceed to chat
      }

      setStatus("Building search index...");
      await loadSupabaseToPinecone(comments.file_name);

      setStatus("Redirecting...");
      router.push(`/chat/${comments.chatId}`);
    } catch (err) {
      console.error("Error creating project:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setLoading(false);
          setStatus("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a new project</DialogTitle>
          <DialogDescription>
            Enter a YouTube video URL or ID to analyze the comment section.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">{status}</p>
            <p className="text-xs text-muted-foreground">This can take a minute for videos with many comments.</p>
          </div>
        ) : (
          <>
            <YtUploadForm postComments={postComments} />
            {error && (
              <p className="mt-3 text-sm text-red-500">{error}</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
