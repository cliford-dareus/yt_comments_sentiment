import { db } from "@/lib/db";
import { $chats } from "@/lib/db/schema";
import { getUser } from "@/lib/lucia";
import loadSupabaseToPinecone from "@/lib/pinecone";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ChatComponent from "./_components/chat-component";
import CommentsComponent from "./_components/comments-component";

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

  console.log(chat);

  if (!chat || !chat[0].fileName) {
    return redirect("/dashboard");
  }

  return (
    <div className="flex max-h-screen h-full">
      <div className="flex w-full max-h-screen">
        <div className=" w-[200px]">sidebar</div>
        <div className="flex-[5] border-x border-l-slate-200 overflow-auto">
          <ChatComponent />
        </div>
        <div className="max-h-screen p-4 flex-[3]">
        <CommentsComponent />
        </div>
      </div>
    </div>
  );
};

export default Chat;
