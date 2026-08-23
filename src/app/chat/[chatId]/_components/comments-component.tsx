import { supabase_bucket } from "@/lib/supabase-bucket";
import CsvComponent from "./csv-component";

type Props = {
  file_name: string;
};

const CommentsComponent = async ({ file_name }: Props) => {
  const { data, error } = await supabase_bucket.storage
    .from("yt_comment_bucket")
    .createSignedUrl(file_name, 3600);

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL for comments:", error);
    return (
      <div className="text-sm text-muted-foreground">
        Could not load comments for this project.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-3">Comments</h2>
      <div className="flex-1 overflow-auto">
        <CsvComponent file={data.signedUrl} />
      </div>
    </div>
  );
};

export default CommentsComponent;
