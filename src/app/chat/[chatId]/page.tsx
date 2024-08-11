import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";
import { getUser } from "@/lib/lucia";
import loadSupabaseToPinecone from "@/lib/pinecone";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const Chat = async ({ params }: { params: { chatId: string } }) => {
  console.log(params);
  const user = await getUser();

  if (!user) {
    return redirect("/auth");
  }

  const chat = await db
    .select()
    .from($chats)
    .where(eq($chats.id, params.chatId));

  if (!chat || !chat[0].fileName) {
    return redirect("/dashboard");
  }

  console.log(chat);
  
  return (
    <div className="">
      <div className=""></div>
      <div className="">
       
      </div>
      c
    </div>
  );
};

export default Chat;
