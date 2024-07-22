import Navigation from "@/components/navigation"

interface LandingLayoutProps {
  children: React.ReactNode
}

export default async function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <main className="relative flex h-[calc(100vh_-_theme(spacing.16))] overflow-hidden">
      <div className="container mx-auto relative z-10">
        <Navigation />
        {children}
      </div>
    </main>
  )
}