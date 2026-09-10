import { CalendarDays, CheckCircle2, Clock, Plus } from "lucide-react";
import { createAppointment, checkInAppointment } from "@/app/actions";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const session = await requireStaff(); const query = await searchParams;
  const [appointments, customers, technicians] = await Promise.all([
    prisma.appointment.findMany({ where: { shopId: session.user.shopId }, include: { customer: true, vehicle: true, technician: true, repairOrder: true }, orderBy: { scheduledAt: "desc" }, take: 30 }),
    prisma.customer.findMany({ where: { shopId: session.user.shopId }, include: { vehicles: true }, orderBy: { lastName: "asc" } }),
    prisma.user.findMany({ where: { shopId: session.user.shopId, role: "TECHNICIAN", isActive: true } }),
  ]);
  return <>
    <PageHeader eyebrow="Schedule" title="Appointments" description="Day and upcoming schedule connected directly to customer, vehicle, technician, and repair order." action={<a href="/appointments?new=1" className="btn btn-primary"><Plus className="size-4" /> Book appointment</a>} />
    {query.new && <form action={createAppointment} className="card mb-5 grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
      <select name="customerId" className="input" required defaultValue=""><option value="" disabled>Customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select>
      <select name="vehicleId" className="input" required defaultValue=""><option value="" disabled>Vehicle</option>{customers.flatMap((c) => c.vehicles.map((v) => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {c.lastName}</option>))}</select>
      <input name="scheduledAt" type="datetime-local" className="input" required />
      <select name="technicianId" className="input" defaultValue=""><option value="">Unassigned technician</option>{technicians.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}</select>
      <input name="serviceType" className="input" placeholder="Service type" required />
      <textarea name="complaint" className="input md:col-span-2" placeholder="Customer complaint" required />
      <button className="btn btn-primary">Create appointment</button>
    </form>}
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b p-4"><button className="btn btn-primary min-h-9 py-1.5">List</button><span className="btn btn-secondary min-h-9 py-1.5 text-muted">Day</span><span className="btn btn-secondary min-h-9 py-1.5 text-muted">Week</span><span className="btn btn-secondary min-h-9 py-1.5 text-muted">Calendar</span></div>
      <div className="divide-y">{appointments.map((appt) => <div key={appt.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[110px_1fr_1fr_auto] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-wider text-brand">{appt.scheduledAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold"><Clock className="size-3.5 text-muted" />{appt.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p></div><div><p className="font-bold">{appt.vehicle.year} {appt.vehicle.make} {appt.vehicle.model}</p><p className="text-xs text-muted">{appt.customer.firstName} {appt.customer.lastName} · {appt.serviceType}</p></div><div><p className="text-sm">{appt.complaint}</p><p className="mt-1 text-xs text-muted">{appt.technician?.name || "Unassigned"}</p></div><div className="flex items-center gap-2"><StatusBadge status={appt.status} />{!appt.repairOrder && !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appt.status) && <details className="relative"><summary className="btn btn-secondary min-h-8 list-none px-2 py-1 text-xs"><CheckCircle2 className="size-3.5" /> Check in</summary><form action={checkInAppointment} className="absolute right-0 z-20 mt-2 grid w-72 gap-2 rounded-xl border bg-white p-4 shadow-xl"><input type="hidden" name="appointmentId" value={appt.id} /><input name="mileage" type="number" defaultValue={appt.vehicle.mileage} className="input" placeholder="Mileage" required /><input name="fuelLevel" type="number" min="0" max="100" defaultValue="50" className="input" placeholder="Fuel %" required /><input name="visibleDamage" className="input" placeholder="Visible damage" /><textarea name="notes" className="input" placeholder="Check-in notes" /><button className="btn btn-primary">Create repair order</button></form></details>}</div></div>)}</div>
      {!appointments.length && <div className="grid min-h-56 place-items-center text-center"><div><CalendarDays className="mx-auto mb-2 size-8 text-muted" /><p>No appointments scheduled.</p></div></div>}
    </div>
  </>;
}
