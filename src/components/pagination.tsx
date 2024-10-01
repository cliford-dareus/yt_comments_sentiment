import { useMemo, useTransition } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
// import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: string;
  pageCount: number;
  per_page?: string;
  sort: string;
  createQueryString: (params: Record<string, string | number | null>) => string;
  router: AppRouterInstance;
  pathname: string;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
};

const Pagination = ({
  page,
  pageCount,
  per_page,
  pathname,
  sort,
  startTransition,
  isPending,
  router,
  createQueryString,
}: Props) => {
  const paginationRange = useMemo(() => {
    const offset = 3;
    const range = [];

    for (
      let i = Math.max(2, Number(page) - offset);
      i <= Math.min(pageCount - 1, Number(page) + offset);
      i++
    ) {
      range.push(i);
    }

    if (Number(page) - offset > 2) {
      range.unshift("...");
    }
    if (Number(page) + offset < pageCount - 1) {
      range.push("...");
    }

    range.unshift(1);
    if (pageCount !== 1) {
      range.push(pageCount);
    }

    if(pageCount === 0) {
      range.shift()
    }

    return range;
  }, [pageCount, page]);

  return (
    <div className="flex items-center justify-center my-4">
      <Button
        className="outline outline-1"
        onClick={() => {
          startTransition(() => {
            router.push(
              `${pathname}?${createQueryString({
                page: Number(page) - 1,
                per_page: per_page ?? null,
                sort,
              })}`
            );
          });
        }}
        disabled={Number(page) === 1 || isPending}
      >
        <ChevronLeft />
      </Button>

      {paginationRange.map((range, i) =>
        range === "..." ? (
          <Button key={i} className="">
            {range}
          </Button>
        ) : (
          <Button
            key={i}
            className=""
            onClick={() => {
              startTransition(() => {
                router.push(
                  `${pathname}?${createQueryString({
                    page: range,
                    sort,
                    per_page: per_page ?? null,
                  })}`
                );
              });
            }}
          >
            {range? range:'...'}
          </Button>
        )
      )}

      <Button
        className="outline outline-1"
        onClick={() => {
          startTransition(() => {
            router.push(
              `${pathname}?${createQueryString({
                page: Number(page) + 1,
                per_page: per_page ?? null,
                sort,
              })}`
            );
          });
        }}
        disabled={Number(page) === pageCount || isPending}
      >
        <ChevronRight />
      </Button>
    </div>
  );
};

export default Pagination;