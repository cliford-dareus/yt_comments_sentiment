import { db } from "@/lib/db";
import { $chats, $sentiment } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ChatComponent from "./_components/chat-component";
import CommentsPanel from "./_components/comments-panel";
import SidebarComponent from "./_components/sidebar-component";
import InsightsDashboard from "./_components/insights-dashboard";
import { getChatMessages } from "./_actions/get-chat-message";
import { getCommentsForChat } from "./_actions/get-comments-for-chat";

const Chat = async ({ params }: { params: { chatId: string } }) => {
  const user = await getUser();

  if (!user) {
    return redirect("/auth");
  }

  const chat = await db
    .select()
    .from($chats)
    .where(eq($chats.id, params.chatId));

  if (!chat.length) {
    return redirect("/dashboard");
  }

  if (chat[0].userId !== user.id) {
    return redirect("/dashboard");
  }

  const [sentimentRows, initialMessages, { comments, stats }] =
    await Promise.all([
      db
        .select()
        .from($sentiment)
        .where(eq($sentiment.chatId, chat[0].id))
        .limit(1),
      getChatMessages(chat[0].id),
      getCommentsForChat(chat[0].id),
    ]);

  const sentiment = sentimentRows[0] ?? null;

  const samples = comments.slice(0, 40).map((c) => ({
    id: c.id,
    text: c.text,
    authorDisplayName: c.authorDisplayName,
    likeCount: c.likeCount,
    sentimentLabel: c.sentimentLabel,
  }));

  return (
    <div className="flex max-h-screen h-full">
      <div className="flex w-full max-h-screen">
        <div className="w-[260px] border-r border-slate-200 hidden xl:block overflow-hidden">
          <SidebarComponent sentiment={sentiment} stats={stats} />
        </div>

        <div className="flex-[5] border-x border-l-slate-200 overflow-hidden flex flex-col min-w-0">
          <InsightsDashboard
            chatId={chat[0].id}
            stats={stats}
            summary={sentiment?.content ?? null}
            samples={samples}
            videoId={chat[0].videoId}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatComponent
              chatId={chat[0].id}
              initialMessages={initialMessages}
            />
          </div>
        </div>

        <div className="max-h-screen p-4 flex-[4] overflow-hidden hidden lg:flex lg:flex-col">
          <CommentsPanel chatId={chat[0].id} comments={comments} />
        </div>
      </div>
    </div>
  );
};

export default Chat;
