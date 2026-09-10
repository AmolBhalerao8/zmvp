import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";
export default async function EstimatesPage() {
  const session = await requireStaff();
  const estimates = await prisma.estimate.findMany({ where: { shopId: session.user.shopId }, include: { customer: true, vehicle: true, repairOrder: true, items: true }, orderBy: { createdAt: "desc" } });
  const sent = estimates.filter((e) => ["SENT", "VIEWED"].includes(e.status)).reduce((s, e) => s + Number(e.total), 0);
  const approved = estimates.filter((e) => e.status === "APPROVED").reduce((s, e) => s + Number(e.total), 0);
  return <><PageHeader eyebrow="Customer authorization" title="Estimates" description="Transparent repair recommendations with connected inspections and line-item approval." /><div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="card p-5"><p className="text-xs text-muted">Awaiting response</p><p className="mt-2 text-2xl font-bold">{money(sent)}</p></div><div className="card p-5"><p className="text-xs text-muted">Approved value</p><p className="mt-2 text-2xl font-bold text-brand">{money(approved)}</p></div><div className="card p-5"><p className="text-xs text-muted">Approval rate</p><p className="mt-2 text-2xl font-bold">{estimates.length ? Math.round(estimates.filter((e) => e.status === "APPROVED").length / estimates.length * 100) : 0}%</p></div></div><div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f8fafa] text-[11px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Estimate</th><th className="px-4 py-3">Customer / Vehicle</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Portal</th></tr></thead><tbody>{estimates.map((e) => <tr key={e.id} className="table-row"><td className="px-5 py-4"><Link className="font-bold text-brand" href={`/repair-orders/${e.repairOrderId}`}>{e.estimateNumber}</Link><p className="text-xs text-muted">{e.items.length} line items · {e.repairOrder.roNumber}</p></td><td className="px-4 py-4">{e.customer.firstName} {e.customer.lastName}<p className="text-xs text-muted">{e.vehicle.year} {e.vehicle.make} {e.vehicle.model}</p></td><td className="px-4 py-4"><StatusBadge status={e.status} /></td><td className="px-4 py-4 font-bold">{money(e.total)}</td><td className="px-4 py-4"><Link href={`/portal/estimate/${e.portalToken}`} target="_blank" className="btn btn-secondary min-h-8 px-2 py-1 text-xs">Open <ExternalLink className="size-3" /></Link></td></tr>)}</tbody></table></div></div></>;
}
