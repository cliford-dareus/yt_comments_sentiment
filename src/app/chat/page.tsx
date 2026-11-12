import getAllChats from "./_actions/get-all-chats";
import ChatItemsWrapper from "./_component/chat-item-wrapper";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

type Props = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

const Chat = async ({ searchParams }: Props) => {
  const user = await getUser();
  if (!user) return redirect("/auth");

  const { page, per_page, sort } = searchParams ?? {};

  const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
  const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;

  const [chats, len] = await getAllChats({
    offset,
    limit,
    sort,
    userId: user.id,
  });

  const pageCount = Math.ceil((len as number) / limit);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Projects
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Video analyses you've run — open one to chat, triage, or draft
          replies.
        </p>
      </div>
      <ChatItemsWrapper
        chats={
          chats as {
            id: string;
            fileId: string;
            fileName: string;
            userId: string;
          }[]
        }
        pageCount={pageCount}
      />
    </div>
  );
};

export default Chat;
