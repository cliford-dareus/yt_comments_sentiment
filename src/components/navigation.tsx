import Link from "next/link";
import { Button } from "./ui/button";
import { BRAND } from "@/lib/brand";

type Props = {
  isAuthenticated: boolean;
};

const Navigation = ({ isAuthenticated }: Props) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white hover:text-white/90"
        >
          {BRAND.name}
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button
              asChild
              className="rounded-full bg-white px-5 text-slate-900 hover:bg-slate-100"
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="hidden rounded-full text-slate-200 hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <Link href="/auth">Log in</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-white px-5 text-slate-900 hover:bg-slate-100"
              >
                <Link href="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navigation;
