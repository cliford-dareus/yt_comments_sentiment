import { db } from "@/lib/db";
import { $chats, $sentiment } from "@/lib/db/schema";
import { getUser } from "@/lib/lucia";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ChatComponent from "./_components/chat-component";
import CommentsComponent from "./_components/comments-component";
import SidebarComponent from "./_components/sidebar-component";
import { getChatMessages } from "./_actions/get-chat-message";

const Chat = async ({ params }: { params: { chatId: string } }) => {
  const user = await getUser();

  if (!user) {
    return redirect("/auth");
  }

  const chat = await db
    .select()
    .from($chats)
    .where(eq($chats.id, params.chatId));

  if (!chat.length || !chat[0].fileName) {
    return redirect("/dashboard");
  }

  // Ownership check
  if (chat[0].userId !== user.id) {
    return redirect("/dashboard");
  }

  const [sentimentRows, initialMessages] = await Promise.all([
    db
      .select()
      .from($sentiment)
      .where(eq($sentiment.chatId, chat[0].id))
      .limit(1),
    getChatMessages(chat[0].id),
  ]);

  const sentiment = sentimentRows[0] ?? null;

  return (
    <div className="flex max-h-screen h-full">
      <div className="flex w-full max-h-screen">
        <div className="w-[260px] border-r border-slate-200 hidden md:block">
          <SidebarComponent sentiment={sentiment} />
        </div>

        <div className="flex-[5] border-x border-l-slate-200 overflow-hidden flex flex-col">
          <ChatComponent
            chatId={chat[0].id}
            initialMessages={initialMessages}
          />
        </div>

        <div className="max-h-screen p-4 flex-[4] overflow-auto hidden lg:block">
          <CommentsComponent file_name={chat[0].fileName} />
        </div>
      </div>
    </div>
  );
};

export default Chat;
