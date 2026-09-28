import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { hasActiveSubscription } from "@/lib/billing";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const isPro =
    session.user.role === "ADMIN" || (await hasActiveSubscription(session.user.id));

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar user={session.user} isPro={isPro} />
      <main className="flex-1 ml-64 p-8 overflow-auto">{children}</main>
    </div>
  );
}
