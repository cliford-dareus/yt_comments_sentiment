import Navigation from "@/components/navigation"
import { getUser } from "@/lib/lucia"

interface LandingLayoutProps {
  children: React.ReactNode
}

export default async function LandingLayout({ children }: LandingLayoutProps) {
  const user = await getUser();
  
  return (
    <main className="relative flex h-[calc(100vh_-_theme(spacing.16))] overflow-hidden">
      <div className="container mx-auto relative z-10">
        <Navigation isAuthenticated={ !!user} />
        {children}
      </div>
    </main>
  )
}