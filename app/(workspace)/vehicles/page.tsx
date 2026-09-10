import Link from "next/link";
import { Car, Search } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireStaff(); const { q } = await searchParams;
  const vehicles = await prisma.vehicle.findMany({
    where: { shopId: session.user.shopId, ...(q ? { OR: [{ make: { contains: q, mode: "insensitive" } }, { model: { contains: q, mode: "insensitive" } }, { vin: { contains: q, mode: "insensitive" } }, { licensePlate: { contains: q, mode: "insensitive" } }] } : {}) },
    include: { customer: true, _count: { select: { repairOrders: true } }, repairOrders: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });
  return <>
    <PageHeader eyebrow="Vehicle records" title="Vehicles" description="Ownership, mileage, service history, diagnostics, inspections, and recommendations in one record." />
    <form className="card mb-4 flex max-w-xl items-center gap-2 p-2"><Search className="ml-2 size-4 text-muted" /><input name="q" defaultValue={q} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm" placeholder="Search make, model, VIN, or plate" /><button className="btn btn-secondary min-h-9 py-1">Search</button></form>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{vehicles.map((v) => <Link href={`/vehicles/${v.id}`} key={v.id} className="card group p-5 hover:-translate-y-0.5 hover:border-brand hover:shadow-md"><div className="mb-5 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-brand"><Car className="size-5" /></span><span className="text-[11px] font-bold uppercase tracking-wider text-muted">{v.licensePlate}</span></div><h2 className="text-lg font-bold group-hover:text-brand">{v.year} {v.make} {v.model}</h2><p className="mt-1 text-sm text-muted">{v.trim} · {v.engine}</p><div className="mt-5 flex justify-between border-t pt-4 text-xs"><span><strong className="block text-sm text-foreground">{v.customer.firstName} {v.customer.lastName}</strong><span className="text-muted">Owner</span></span><span className="text-right"><strong className="block text-sm text-foreground">{v.mileage.toLocaleString()} mi</strong><span className="text-muted">{v._count.repairOrders} service visits</span></span></div></Link>)}</div>
  </>;
}
