import Pagination from "@/components/pagination";
import getAllChats from "./_actions/get-all-chats";
import ChatItemsWrapper from "./_component/chat-item-wrapper";
import { getUser } from "@/lib/lucia";

type Props = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

const Chats = async ({ searchParams }: Props) => {
  const user = await getUser();
  const { page, per_page, sort } = searchParams ?? {};

  const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
  const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;

  const [ chats , len ] = await getAllChats({offset, limit, sort, userId: user?.id as string});

  const pageCount = Math.ceil((len as number) / limit);

  return (
    <div className="pt-16 flex-1 p-4 md:max-w-6xl md:mx-auto">
      <div className=""></div>
          <ChatItemsWrapper chats={ chats as {id: string, fileId: string, fileName: string, userId: string}[]} pageCount={pageCount} />
    </div>
  );
};

export default Chats;
