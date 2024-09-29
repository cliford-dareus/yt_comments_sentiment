"use client";

import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

type Props = {
  postComments: (data: z.infer<typeof UploadSchema>) => Promise<void>
}

export const UploadSchema = z.object({
  videoId: z.string(),
});

const YtUploadForm = ({postComments}: Props) => {
  const form = useForm<z.infer<typeof UploadSchema>>();

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
          <Button className="px-8">
            Upload File
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default YtUploadForm;
