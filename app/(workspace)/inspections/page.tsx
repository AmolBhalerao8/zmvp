import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export default async function InspectionsPage() {
  const session = await requireStaff();
  const inspections = await prisma.inspection.findMany({ where: { shopId: session.user.shopId }, include: { vehicle: true, technician: true, repairOrder: true, items: true }, orderBy: { updatedAt: "desc" } });
  return <><PageHeader eyebrow="Digital vehicle inspection" title="Inspections" description="Color-coded findings, technician notes, measurements, media, and fact-grounded customer summaries." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{inspections.map((item) => { const red = item.items.filter((i) => i.rating === "RED").length; const yellow = item.items.filter((i) => i.rating === "YELLOW").length; return <Link key={item.id} href={`/repair-orders/${item.repairOrderId}`} className="card p-5 hover:border-brand"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-brand"><ClipboardCheck className="size-5" /></span><StatusBadge status={item.overallRating} /></div><h2 className="mt-4 font-bold">{item.vehicle.year} {item.vehicle.make} {item.vehicle.model}</h2><p className="mt-1 text-xs text-muted">{item.repairOrder.roNumber} · {item.technician?.name}</p><div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-center text-xs"><span><strong className="block text-base text-emerald-700">{item.items.filter((i) => i.rating === "GREEN").length}</strong>Good</span><span><strong className="block text-base text-amber-700">{yellow}</strong>Watch</span><span><strong className="block text-base text-red-700">{red}</strong>Urgent</span></div></Link>; })}</div></>;
}
