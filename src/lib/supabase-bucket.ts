import { createClient } from "@supabase/supabase-js";

export const uploadToSupabase = async (videoName: string, file: any, userId: string) => {
  // Create Supabase client with service key
  const sup = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Set the user_id as a PostgreSQL setting
  await sup.rpc('set_claim', { claim: 'app.user_id', value: userId })

  const { data: uploadData, error } = await sup.storage
    .from('yt_comment_bucket')
    .upload(`csv-files/${videoName}_${Date.now()}.csv`, file, {
      // cacheControl: '3600',
      // upsert: false,
      contentType: 'text/csv',
    });

  if (error) {
    throw new Error
  }
  
  return uploadData;
};