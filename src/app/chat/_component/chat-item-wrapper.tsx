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

  if (!chats.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-zinc-500">No projects yet.</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/dashboard">Analyze a video</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <span className="line-clamp-2 text-sm font-medium text-zinc-900">
              {chat.fileName || "Untitled project"}
            </span>
            <div className="mt-4 flex items-center gap-2">
              <Button asChild size="sm" className="h-8">
                <Link href={`/chat/${chat.id}`}>Open</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-zinc-400 hover:text-red-600"
                onClick={async () => {
                  await deleteChat(chat.id);
                  router.refresh();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
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
    </div>
  );
};

export default ChatItemsWrapper;
