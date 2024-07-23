interface AuthLayoutProps {
  children: React.ReactNode
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-black">
      {children}
    </div>
  )
}