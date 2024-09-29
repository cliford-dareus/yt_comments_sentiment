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

const CreateProjectDialog = () => {
  const router = useRouter();
  const [loading, setloading] = useState(false);
  const [text, setText] = useState("");

  const postComments = async (data: z.infer<typeof UploadSchema>) => {
    try {
      setloading(true);
      setText("Fetching comments from youtube...");
      const comments = await uploadYtToSupabase({ videoId: data.videoId });
      console.log(comments);
      if (!comments.file_key || !comments.file_name) {
        return;
      }

      setText("");
      // Get the comments sentiment

      setText("");
      // Load file to pinecone
      const vector = await loadSupabaseToPinecone(comments.file_name);

      router.push(`chat/${comments.chatId}`);
      setloading(false);
    } catch (error) {
      console.log("Error", error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a new project</DialogTitle>
          <DialogDescription>
            Enter the youtube url you want to analyze.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="">{text}</div>
        ) : (
          <YtUploadForm postComments={postComments} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
