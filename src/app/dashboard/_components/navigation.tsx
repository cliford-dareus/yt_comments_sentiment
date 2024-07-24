'use client'

import { UserType } from "@/lib/db/schema";
import Link from "next/link";

type Props = {
  user: UserType
}

const Navigation = ({user}: Props) => {
  console.log(user)
  return (
    <div className="pl-[100px] py-4 border flex">
      <div className="flex gap-4 items-center">
        <div className="mr-8">
          <Link className="text-black w-[245px] font-bold" href='/'>Comment.ai</Link>
        </div>

        <div className="flex gap-4 items-center">
          <div>{ user?.fullName }</div>
          <div className="border px-4 rounded-full">Free</div>
        </div>

        <div>Documentation</div>
      </div>
    </div>
  )
};

export default Navigation;