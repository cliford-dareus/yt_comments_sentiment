import { createClient } from "@supabase/supabase-js";
import { getUser } from "./lucia";
// import { supabase } from "./supabase";

export const uploadToSupabase = async (videoName: string, file: any, userId: string) => {
  // Create Supabase client with service key
  const sup = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  
  console.log("SUPABASE", sup)

  // Set the user_id as a PostgreSQL setting
  await sup.rpc('set_claim', { claim: 'app.user_id', value: userId })

  // Perform the file upload
  // const { data, error } = await supabase.storage
  //   .from('your_bucket_id')
  //   .upload(`${userId}/${req.body.fileName}`, req.body.file)

  const { data: uploadData, error } = await sup.storage
    .from('yt_comment_bucket')
    .upload(`csv-files/${videoName}_${Date.now()}.csv`, file, {
      // cacheControl: '3600',
      // upsert: false,
      contentType: 'text/csv',
    });

  if (error) {
    console.log(error)
    throw new Error
  }
  return uploadData;
};