import Link from "next/link";
import { Activity, CalendarDays, Car, CircleDollarSign, Clock3, FileCheck2, Wrench } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/utils";
import { MetricCard, PageHeader, SectionHeader, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireStaff();
  const shopId = session.user.shopId;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const month = new Date(start.getFullYear(), start.getMonth(), 1);
  const [
    todayAppointments, vehiclesInShop, activeOrders, awaitingApproval, waitingParts,
    ready, unpaid, paidInvoices, technicians, recentOrders,
  ] = await Promise.all([
    prisma.appointment.findMany({ where: { shopId, scheduledAt: { gte: start, lt: end }, status: { notIn: ["CANCELLED", "NO_SHOW"] } }, include: { customer: true, vehicle: true, technician: true }, orderBy: { scheduledAt: "asc" } }),
    prisma.repairOrder.count({ where: { shopId, status: { notIn: ["COMPLETED", "CLOSED"] } } }),
    prisma.repairOrder.count({ where: { shopId, status: { in: ["DIAGNOSING", "IN_REPAIR", "QUALITY_CHECK"] } } }),
    prisma.repairOrder.count({ where: { shopId, status: "AWAITING_APPROVAL" } }),
    prisma.repairOrder.count({ where: { shopId, status: "WAITING_FOR_PARTS" } }),
    prisma.repairOrder.count({ where: { shopId, status: "READY_FOR_PICKUP" } }),
    prisma.invoice.count({ where: { shopId, status: { in: ["OPEN", "PARTIALLY_PAID"] } } }),
    prisma.invoice.findMany({ where: { shopId, status: "PAID", paidAt: { gte: month } }, select: { total: true } }),
    prisma.user.findMany({ where: { shopId, role: "TECHNICIAN", isActive: true }, include: { _count: { select: { repairOrders: { where: { status: { notIn: ["COMPLETED", "CLOSED"] } } } } } } }),
    prisma.repairOrder.findMany({ where: { shopId }, include: { customer: true, vehicle: true, technician: true }, orderBy: { updatedAt: "desc" }, take: 6 }),
  ]);
  const revenue = paidInvoices.reduce((sum, item) => sum + Number(item.total), 0);
  const completedCount = await prisma.repairOrder.count({ where: { shopId, status: { in: ["COMPLETED", "CLOSED"] }, updatedAt: { gte: month } } });
  const avgRo = completedCount ? revenue / completedCount : 0;

  return (
    <>
      <PageHeader eyebrow="Thursday, September 10" title={`Good morning, ${session.user.name?.split(" ")[0]}`} description="Here’s what’s moving through ZOL Motorworks today." action={<Link href="/appointments?new=1" className="btn btn-primary"><CalendarDays className="size-4" /> New appointment</Link>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Appointments today" value={todayAppointments.length} detail="Today" icon={CalendarDays} />
        <MetricCard label="Vehicles in shop" value={vehiclesInShop} detail={`${activeOrders} active`} icon={Car} tone="blue" />
        <MetricCard label="Awaiting approval" value={awaitingApproval} detail="Needs action" icon={FileCheck2} tone="amber" />
        <MetricCard label="Month revenue" value={money(revenue)} detail={`${money(avgRo)} avg RO`} icon={CircleDollarSign} tone="violet" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <section className="card overflow-hidden">
          <SectionHeader title="Today’s schedule" detail={`${todayAppointments.length} vehicles expected`} href="/appointments" />
          <div className="divide-y">
            {todayAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-14 text-sm font-bold">{appt.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">{appt.vehicle.make.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{appt.vehicle.year} {appt.vehicle.make} {appt.vehicle.model}</p><p className="truncate text-xs text-muted">{appt.customer.firstName} {appt.customer.lastName} · {appt.serviceType}</p></div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
            {!todayAppointments.length && <div className="p-8 text-center text-sm text-muted">No appointments today.</div>}
          </div>
        </section>

        <section className="card overflow-hidden">
          <SectionHeader title="Shop pulse" detail="Live workflow counts" />
          <div className="grid grid-cols-2 gap-px bg-line">
            {[
              ["In progress", activeOrders, Wrench, "text-blue-700 bg-blue-50"],
              ["Waiting parts", waitingParts, Clock3, "text-violet-700 bg-violet-50"],
              ["Ready pickup", ready, Car, "text-emerald-700 bg-emerald-50"],
              ["Unpaid invoices", unpaid, CircleDollarSign, "text-amber-700 bg-amber-50"],
            ].map(([label, value, Icon, color]) => {
              const IconComponent = Icon as typeof Wrench;
              return <div key={label as string} className="bg-white p-5"><span className={`mb-4 grid size-9 place-items-center rounded-xl ${color}`}><IconComponent className="size-4" /></span><p className="text-2xl font-bold">{value as number}</p><p className="mt-1 text-xs text-muted">{label as string}</p></div>;
            })}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <section className="card overflow-hidden">
          <SectionHeader title="Repair order pipeline" detail="Most recently updated" href="/repair-orders" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8fafa] text-[11px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">RO / Vehicle</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Technician</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody>{recentOrders.map((ro) => <tr key={ro.id} className="table-row hover:bg-[#fbfcfc]"><td className="px-5 py-3.5"><Link href={`/repair-orders/${ro.id}`} className="font-bold text-brand">{ro.roNumber}</Link><p className="text-xs text-muted">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</p></td><td className="px-4 py-3.5">{ro.customer.firstName} {ro.customer.lastName}</td><td className="px-4 py-3.5 text-muted">{ro.technician?.name || "Unassigned"}</td><td className="px-4 py-3.5"><StatusBadge status={ro.status} /></td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className="card overflow-hidden">
          <SectionHeader title="Technician workload" detail="Active assignments" href="/technicians" />
          <div className="space-y-5 p-5">
            {technicians.map((tech) => {
              const load = tech._count.repairOrders;
              return <div key={tech.id}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">{tech.name}</span><span className="text-xs text-muted">{load} jobs</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, load * 20)}%` }} /></div></div>;
            })}
          </div>
          <div className="border-t bg-emerald-50/50 p-4 text-xs text-brand"><Activity className="mr-2 inline size-4" /> Shop capacity is balanced across the team.</div>
        </section>
      </div>
    </>
  );
}
