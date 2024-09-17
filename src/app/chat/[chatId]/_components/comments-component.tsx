import { supabase } from "@/lib/supabase";
import { supabase_bucket } from "@/lib/supabase-bucket";
import Papa from 'papaparse'
import CsvComponent from "./csv-component";

const CommentsComponent = async () => {
  
  const { data, error } = await supabase_bucket.storage
    .from("yt_comment_bucket")
    .createSignedUrl("csv-files/XE5vOBL170I_1722284063873.csv", 3600);

  if (error) {
    console.log(error)
  }

  return <div className="">
    <CsvComponent file={ data?.signedUrl }/>
  </div>;
};

export default CommentsComponent;
