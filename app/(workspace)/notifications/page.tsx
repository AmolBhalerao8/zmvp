import Link from "next/link";
import { Bell } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export default async function NotificationsPage() {
  const session = await requireStaff();
  const notifications = await prisma.notification.findMany({ where: { shopId: session.user.shopId, OR: [{ userId: null }, { userId: session.user.id }] }, orderBy: { createdAt: "desc" }, take: 100 });
  return <><PageHeader eyebrow="Activity" title="Notifications" description="Workflow events across appointments, approvals, parts, repairs, invoices, and payments." /><div className="card overflow-hidden">{notifications.map((n) => <Link key={n.id} href={n.href || "#"} className="flex gap-4 border-t p-5 first:border-0 hover:bg-gray-50"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-brand"><Bell className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="font-bold">{n.title}</p><StatusBadge status={n.type} /></div><p className="mt-1 text-sm text-muted">{n.body}</p><p className="mt-2 text-[11px] text-muted">{n.createdAt.toLocaleString()}</p></div></Link>)}</div></>;
}
