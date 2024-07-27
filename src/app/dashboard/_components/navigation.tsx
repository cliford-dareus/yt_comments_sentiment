'use client'

import { UserType } from "@/lib/db/schema";
import Link from "next/link";

type Props = {
  user: UserType
}

const Navigation = ({user}: Props) => {
  console.log(user)
  return (
    <div className="pl-[76px] py-4 border flex">
      <div className="flex gap-4 items-center">
        <div className="mr-8">
          <Link className="text-xl text-black w-[245px] font-bold" href='/'>Comment.ai</Link>
        </div>

        <div className="flex gap-4 items-center border-x px-4">
          <div>{ user?.fullName }</div>
          <div className="border px-4 rounded-full bg-black text-white font-medium">Free</div>
        </div>

        <div>Documentation</div>
      </div>
    </div>
  )
};

export default Navigation;