import Background from "@/components/background";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  return (
    <Background classnames="flex justify-center items-center flex-col gap-4 text-center">
      <>
        <span className="">Re-Ignite your reach</span>
        <h1 className="text-white text-7xl w-[25ch] font-medium">Audience Feelings About Your Youtube Video</h1>
        <Button >Get Started !</Button>
        <p className="w-[30ch] text-white">Check if your fans Likes, Dislike or neutral about your video  </p>
      </>
    </Background>
  );
}
