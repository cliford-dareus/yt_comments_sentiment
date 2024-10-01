"use client";

import { deleteChat } from "@/app/actions";
import Pagination from "@/components/pagination";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

type ChatsProps = {
  chats: { id: string; fileId: string; fileName: string; userId: string }[];
  pageCount: number;
};

const ChatItemsWrapper = ({ chats, pageCount }: ChatsProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = searchParams.get("page") ?? "1";
  const per_page = searchParams.get("per_page") ?? "8";
  const sort = searchParams.get("sort") ?? "";

  const [isPending, startTransition] = useTransition();

  const createQueryString = useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString());

      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, String(value));
        }
      }
      return newSearchParams.toString();
    },
    [searchParams],
  );

  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-4 mt-4">
        {chats.map((chat) => (
          <div key={chat.id}>
            {chat.fileName}
            <Link href={`/chat/${chat.id}`}>Open</Link>
            <Button
              onClick={async () => {
                await deleteChat(chat.id);
                router.refresh();
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>

      <Pagination
        page={page}
        per_page={per_page}
        sort={sort}
        pageCount={pageCount}
        pathname={pathname}
        createQueryString={createQueryString}
        router={router}
        isPending={isPending}
        startTransition={startTransition}
      />
    </div>
  );
};

export default ChatItemsWrapper;
