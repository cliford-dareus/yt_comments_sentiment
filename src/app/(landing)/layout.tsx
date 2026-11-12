import Navigation from "@/components/navigation";
import { getUser } from "@/lib/auth";

interface LandingLayoutProps {
  children: React.ReactNode;
}

export default async function LandingLayout({ children }: LandingLayoutProps) {
  const user = await getUser();

  return (
    <main className="relative min-h-screen">
      <Navigation isAuthenticated={Boolean(user?.id)} />
      {children}
    </main>
  );
}
