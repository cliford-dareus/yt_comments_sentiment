import Background from "@/components/background";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <Background classnames="flex justify-center items-center">
      <div className="max-w-[800px] flex flex-col items-center gap-4 text-center">
        <span className="text-slate-400 text-xl font-medium">Re-Ignite your reach</span>
        <h1 className="text-slate-300 text-6xl font-medium">Audience Feelings About Your Youtube Video</h1>
        <Button className="w-[250px] rounded-full bg-transparent border border-slate-400 py-4" size="lg">
          <Link href="/auth">Get Started !</Link>
          </Button>
        <p className="w-[30ch] text-slate-400">Check if your fans <span className="text-white">Likes</span>, <span className="text-white">Dislike</span> or <span className="text-white">Neutral</span> about your video  </p>
      </div>
    </Background>
  );
}
