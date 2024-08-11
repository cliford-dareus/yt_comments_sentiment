'use client'

import { UserType } from "@/lib/db/schema";
import Link from "next/link";

type Props = {
  user: UserType
}

const Navigation = ({user}: Props) => {
  return (
    <div className="pl-[60px] border-b flex">
      <div className="flex items-center">
        <div className="w-[200px] min-w-[200px] p-4 border-r">
          <Link className="text-xl text-black w-[245px] font-bold" href='/'>Comment.ai</Link>
        </div>

        <div className="flex gap-4 items-center px-4 h-full">
          <div>{ user?.fullName }</div>
          <div className="border px-4 rounded-full bg-black text-white font-medium">Free</div>
        </div>

        <div>Documentation</div>
      </div>
    </div>
  )
};

export default Navigation;