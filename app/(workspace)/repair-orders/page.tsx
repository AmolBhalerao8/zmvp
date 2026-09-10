import Link from "next/link";
import { Wrench } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";
export default async function RepairOrdersPage() {
  const session = await requireStaff();
  const orders = await prisma.repairOrder.findMany({ where: { shopId: session.user.shopId }, include: { customer: true, vehicle: true, technician: true, estimates: { orderBy: { createdAt: "desc" }, take: 1 }, invoice: true, _count: { select: { parts: true, diagnostics: true } } }, orderBy: { updatedAt: "desc" } });
  return <>
    <PageHeader eyebrow="Core workflow" title="Repair orders" description="Every vehicle in the shop, from check-in and diagnosis through approval, repair, invoice, and closeout." />
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{["All", "Diagnosing", "Awaiting approval", "Waiting for parts", "In repair", "Ready for pickup"].map((item, i) => <span key={item} className={`btn whitespace-nowrap ${i === 0 ? "btn-primary" : "btn-secondary"}`}>{item}</span>)}</div>
    <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f8fafa] text-[11px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Repair order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Technician</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Estimate</th><th className="px-4 py-3">Updated</th></tr></thead><tbody>{orders.map((ro) => <tr key={ro.id} className="table-row hover:bg-[#fbfcfc]"><td className="px-5 py-4"><Link href={`/repair-orders/${ro.id}`} className="font-bold text-brand">{ro.roNumber}</Link><p className="mt-0.5 text-xs font-medium">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</p><p className="max-w-xs truncate text-xs text-muted">{ro.complaint}</p></td><td className="px-4 py-4">{ro.customer.firstName} {ro.customer.lastName}</td><td className="px-4 py-4 text-muted">{ro.technician?.name || "Unassigned"}</td><td className="px-4 py-4"><StatusBadge status={ro.status} /><p className="mt-1 text-[11px] text-muted">{ro._count.diagnostics} diagnostics · {ro._count.parts} parts</p></td><td className="px-4 py-4 font-semibold">{ro.estimates[0] ? money(ro.estimates[0].total) : "—"}{ro.invoice && <p className="text-[11px] text-muted">Invoice {ro.invoice.status.toLowerCase()}</p>}</td><td className="px-4 py-4 text-xs text-muted">{ro.updatedAt.toLocaleDateString()}</td></tr>)}</tbody></table></div>{!orders.length && <div className="grid min-h-56 place-items-center"><Wrench className="size-9 text-muted" /></div>}</div>
  </>;
}
