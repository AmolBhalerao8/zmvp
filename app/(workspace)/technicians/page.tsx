import Link from "next/link";
import { Gauge, Wrench } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export default async function TechniciansPage() {
  const session = await requireStaff();
  const techs = await prisma.user.findMany({ where: { shopId: session.user.shopId, role: "TECHNICIAN", isActive: true }, include: { repairOrders: { where: { status: { notIn: ["COMPLETED", "CLOSED"] } }, include: { vehicle: true, customer: true }, orderBy: { promisedAt: "asc" } } } });
  return <><PageHeader eyebrow="Technician workflow" title="Job board" description="Mobile-friendly assignments organized by technician, urgency, approval, and parts state." /><div className="grid gap-5 xl:grid-cols-2">{techs.map((tech) => <section key={tech.id} className="card overflow-hidden"><div className="flex items-center gap-3 border-b p-5"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-brand"><Gauge className="size-5" /></span><div className="flex-1"><h2 className="font-bold">{tech.name}</h2><p className="text-xs text-muted">{tech.specialties.join(" · ") || "General service"}</p></div><strong>{tech.repairOrders.length} jobs</strong></div><div className="space-y-3 p-4">{tech.repairOrders.map((ro) => <Link href={`/repair-orders/${ro.id}`} key={ro.id} className="block rounded-xl border p-4 hover:border-brand"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-brand">{ro.roNumber}</p><p className="mt-1 text-sm font-semibold">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</p></div><StatusBadge status={ro.status} /></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-muted">{ro.complaint}</p><p className="mt-3 text-[11px] font-semibold">Due {ro.promisedAt?.toLocaleString() || "not scheduled"}</p></Link>)}{!tech.repairOrders.length && <div className="grid h-36 place-items-center text-center text-sm text-muted"><div><Wrench className="mx-auto mb-2 size-6" />No active jobs</div></div>}</div></section>)}</div></>;
}
