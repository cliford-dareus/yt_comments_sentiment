import Link from "next/link";
import { Button } from "./ui/button";

type Props = {
  isAuthenticated: boolean;
};

const Navigation = ({ isAuthenticated }: Props) => {
  return (
    <header className="absolute top-4 left-0 right-0 text-white px-[2em] z-50 h-[40px]">
      <div className="flex justify-between items-center h-full">
        <Link className="text-white w-[245px] font-bold" href="/">
          Comment.ai
        </Link>

        <div className="w-[180px] relative h-full hidden lg:block">
          <div className="flex gap-24 absolute left-0 top-2">
            <div className="">
              <ul className="">
                <li className="text-indigo-500">HomePage</li>
                <li className="text-slate-300">Features</li>
                <li className="text-slate-300">Pricing</li>
              </ul>
            </div>
            <div>
              <ul>
                <li className="text-slate-300">How-it-works</li>
                <li className="text-slate-300">Blog</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="gap-4 w-[245px] hidden md:flex">
          <Button className="rounded-full px-8 bg-transparent border border-slate-400">
            Entreprise
          </Button>
          <Button className="rounded-full px-8 bg-slate-300 text-black">
            {isAuthenticated ? "Dashboard" : "Log In"}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
