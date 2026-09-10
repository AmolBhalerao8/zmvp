import Link from "next/link";
import { CalendarDays, Car, FileText, Search, User, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireStaff(); const { q = "" } = await searchParams; const term = q.trim();
  const [customers, vehicles, orders, appointments, invoices] = term ? await Promise.all([
    prisma.customer.findMany({ where: { shopId: session.user.shopId, OR: [{ firstName: { contains: term, mode: "insensitive" } }, { lastName: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }] }, take: 8 }),
    prisma.vehicle.findMany({ where: { shopId: session.user.shopId, OR: [{ make: { contains: term, mode: "insensitive" } }, { model: { contains: term, mode: "insensitive" } }, { licensePlate: { contains: term, mode: "insensitive" } }, { vin: { contains: term, mode: "insensitive" } }] }, take: 8 }),
    prisma.repairOrder.findMany({ where: { shopId: session.user.shopId, OR: [{ roNumber: { contains: term, mode: "insensitive" } }, { complaint: { contains: term, mode: "insensitive" } }] }, include: { vehicle: true }, take: 8 }),
    prisma.appointment.findMany({ where: { shopId: session.user.shopId, serviceType: { contains: term, mode: "insensitive" } }, include: { vehicle: true }, take: 8 }),
    prisma.invoice.findMany({ where: { shopId: session.user.shopId, invoiceNumber: { contains: term, mode: "insensitive" } }, include: { customer: true }, take: 8 }),
  ]) : [[], [], [], [], []];
  const sections = [
    ["Customers", User, customers.map((c) => ({ href: `/customers/${c.id}`, title: `${c.firstName} ${c.lastName}`, detail: c.phone }))],
    ["Vehicles", Car, vehicles.map((v) => ({ href: `/vehicles/${v.id}`, title: `${v.year} ${v.make} ${v.model}`, detail: `${v.licensePlate} · ${v.vin}` }))],
    ["Repair orders", Wrench, orders.map((o) => ({ href: `/repair-orders/${o.id}`, title: o.roNumber, detail: `${o.vehicle.year} ${o.vehicle.make} ${o.vehicle.model} · ${o.complaint}` }))],
    ["Appointments", CalendarDays, appointments.map((a) => ({ href: "/appointments", title: a.serviceType, detail: `${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}` }))],
    ["Invoices", FileText, invoices.map((i) => ({ href: "/invoices", title: i.invoiceNumber, detail: `${i.customer.firstName} ${i.customer.lastName}` }))],
  ] as const;
  return <><PageHeader eyebrow="Find anything" title="Global search" description="Search connected customers, vehicles, repair orders, appointments, and invoices." /><form className="card mb-6 flex items-center gap-2 p-2"><Search className="ml-3 size-5 text-muted" /><input autoFocus name="q" defaultValue={term} className="min-w-0 flex-1 px-2 py-2 text-base outline-none" placeholder="Try “2015 Sonic”, “Amol”, or “RO-1048”" /><button className="btn btn-primary">Search</button></form>{term && <div className="grid gap-5 md:grid-cols-2">{sections.filter(([, , items]) => items.length).map(([name, Icon, items]) => <section className="card overflow-hidden" key={name}><div className="flex items-center gap-2 border-b p-4 font-bold"><Icon className="size-4 text-brand" />{name}<span className="ml-auto text-xs text-muted">{items.length}</span></div>{items.map((item) => <Link key={`${item.href}-${item.title}`} href={item.href} className="block border-t px-4 py-3 first:border-0 hover:bg-gray-50"><p className="text-sm font-bold">{item.title}</p><p className="truncate text-xs text-muted">{item.detail}</p></Link>)}</section>)}</div>}</>;
}
