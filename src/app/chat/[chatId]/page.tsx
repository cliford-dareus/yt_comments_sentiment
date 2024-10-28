import { db } from "@/lib/db";
import { $chats, $sentiment } from "@/lib/db/schema";
import { getUser } from "@/lib/lucia";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ChatComponent from "./_components/chat-component";
import CommentsComponent from "./_components/comments-component";
import SidebarComponent from "./_components/sidebar-component";

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

  const sentiment = await db
    .select()
    .from($sentiment)
    .where(eq($sentiment.chatId, chat[0].id));

  return (
    <div className="flex max-h-screen h-full">
      <div className="flex w-full max-h-screen">
        <div className=" w-[200px]">
          {/* <SidebarComponent sentiment={sentiment}/> */}
        </div>
        <div className="flex-[5] border-x border-l-slate-200 overflow-auto">
          <ChatComponent chatId={chat[0].id} />
        </div>
        <div className="max-h-screen p-4 flex-[4] overflow-auto">
          <CommentsComponent file_name={chat[0].fileName} />
        </div>
      </div>
    </div>
  );
};

export default Chat;
