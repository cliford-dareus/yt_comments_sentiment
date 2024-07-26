'use client'

import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { useState } from "react"
import getComments from "../_actions/get-comments";
import { Input } from "@/components/ui/input";
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const UploadSchema = z.object({
  videoId: z.string()
});

const YtUploadForm = () => {
  const [comment, setComment] = useState();
  const [loading, setloading] = useState(false)

  const form = useForm<z.infer<typeof UploadSchema>>();

  const postComments = async (data: z.infer<typeof UploadSchema>) => {
    try {
      setloading(true);
      const comments = await getComments({ videoId: data.videoId });
      setComment(comments);
      console.log(comment)
      setloading(false);
    } catch (error) {
      console.log('Error', error)
    }
  };

  if (loading) {
    return <div>LOADING...</div>
  }

  return (
    <div className="">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(postComments)}>
          <FormField
            control={form.control}
            name='videoId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="videoId"  {...field} />
                </FormControl>
                <FormDescription>
                  This is your public display name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button>Fetch</Button>
        </form>
      </Form>
    </div>
  )
};

export default YtUploadForm;
