import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gauge, History, User } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff(); const { id } = await params;
  const vehicle = await prisma.vehicle.findFirst({ where: { id, shopId: session.user.shopId }, include: { customer: true, repairOrders: { include: { diagnostics: true, inspections: true, estimates: true, invoice: true }, orderBy: { createdAt: "desc" } }, followUps: { where: { status: { in: ["OPEN", "SCHEDULED"] } } } } });
  if (!vehicle) notFound();
  return <>
    <Link href="/vehicles" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-muted"><ArrowLeft className="size-3.5" /> Vehicles</Link>
    <PageHeader title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} description={`${vehicle.trim || ""} · ${vehicle.engine || "Engine not recorded"} · VIN ${vehicle.vin || "Not recorded"}`} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="card p-5"><User className="mb-3 size-5 text-brand" /><p className="font-bold">{vehicle.customer.firstName} {vehicle.customer.lastName}</p><Link href={`/customers/${vehicle.customer.id}`} className="text-xs text-brand">View owner</Link></div><div className="card p-5"><Gauge className="mb-3 size-5 text-blue-600" /><p className="font-bold">{vehicle.mileage.toLocaleString()} miles</p><p className="text-xs text-muted">Current recorded mileage</p></div><div className="card p-5"><History className="mb-3 size-5 text-violet-600" /><p className="font-bold">{vehicle.repairOrders.length} service visits</p><p className="text-xs text-muted">{vehicle.followUps.length} upcoming recommendations</p></div></div>
    <section className="card overflow-hidden"><div className="border-b p-5"><h2 className="font-bold">Complete service history</h2></div>{vehicle.repairOrders.map((ro) => <Link key={ro.id} href={`/repair-orders/${ro.id}`} className="grid items-center gap-3 border-t px-5 py-4 first:border-0 hover:bg-gray-50 sm:grid-cols-[1fr_auto_auto]"><div><p className="font-bold text-brand">{ro.roNumber}</p><p className="text-xs text-muted">{ro.createdAt.toLocaleDateString()} · {ro.complaint}</p></div><p className="text-xs text-muted">{ro.diagnostics.length} diagnostics · {ro.inspections.length} inspections</p><StatusBadge status={ro.status} /></Link>)}</section>
  </>;
}
