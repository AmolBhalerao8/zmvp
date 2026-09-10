import { signOut } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (session.user.role === "CUSTOMER") {
    redirect("/customer");
  }
  const notifications = await prisma.notification.count({
    where: { shopId: session.user.shopId, OR: [{ userId: null }, { userId: session.user.id }], readAt: null },
  });
  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  return <AppShell user={session.user} notifications={notifications} signOutAction={signOutAction}>{children}</AppShell>;
}
