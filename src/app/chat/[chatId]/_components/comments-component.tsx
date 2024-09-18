import { supabase } from "@/lib/supabase";
import { supabase_bucket } from "@/lib/supabase-bucket";
import Papa from "papaparse";
import CsvComponent from "./csv-component";

type Props = {
  file_name: string;
};

const CommentsComponent = async ({ file_name }: Props) => {
  const { data, error } = await supabase_bucket.storage
    .from("yt_comment_bucket")
    .createSignedUrl(`${file_name}`, 3600);

  if (error) {
    console.log(error);
  }

  return (
    <div className="">
      <h2>Title</h2>
      <CsvComponent file={data?.signedUrl} />
    </div>
  );
};

export default CommentsComponent;
