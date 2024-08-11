"use client";

import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import uploadYtToSupabase from "../_actions/get-comments";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";
import loadSupabaseToPinecone from "@/lib/pinecone";

const UploadSchema = z.object({
  videoId: z.string(),
});

const YtUploadForm = () => {
  const router = useRouter();
  const [loading, setloading] = useState(false);

  const form = useForm<z.infer<typeof UploadSchema>>();

  const postComments = async (data: z.infer<typeof UploadSchema>) => {
    try {
      setloading(true);
      const comments = await uploadYtToSupabase({ videoId: data.videoId });
      console.log(comments)
      if(!comments.file_key || !comments.file_name){
        return;
      }
      
      // Load file to pinecone
      const vertor = await loadSupabaseToPinecone(comments.file_name);
    
      router.push(`chat/${comments.chatId}`);
      setloading(false);
    } catch (error) {
      console.log("Error", error);
    }
  };

  if (loading) {
    return <div>LOADING...</div>;
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(postComments)}
          className="flex items-center gap-4"
        >
          <FormField
            control={form.control}
            name="videoId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormControl>
                  <Input
                    className="flex-1"
                    placeholder="Enter a youtube video url..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={loading} className="px-8">
            Upload File
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default YtUploadForm;
