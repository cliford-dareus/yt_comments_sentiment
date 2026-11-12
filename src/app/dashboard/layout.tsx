import { getUser } from "@/lib/auth";
import AppShell from "@/components/app-shell";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    return redirect("/auth");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
