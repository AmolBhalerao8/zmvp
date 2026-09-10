import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Car, CircleDollarSign, MessageSquare, Wrench } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/utils";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, shopId: session.user.shopId },
    include: {
      vehicles: true,
      repairOrders: { include: { vehicle: true }, orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" }, take: 5 },
      calls: { orderBy: { startedAt: "desc" }, take: 5 },
      followUps: { where: { status: { in: ["OPEN", "SCHEDULED"] } }, include: { vehicle: true } },
    },
  });
  if (!customer) notFound();
  const lifetime = customer.invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + Number(i.total), 0);
  return <>
    <Link href="/customers" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-muted"><ArrowLeft className="size-3.5" /> Customers</Link>
    <PageHeader title={`${customer.firstName} ${customer.lastName}`} description={`${customer.phone} · ${customer.email || "No email"} · Prefers ${customer.preferredContact.toLowerCase()}`} action={<Link href={`/messages?customer=${customer.id}`} className="btn btn-primary"><MessageSquare className="size-4" /> Message</Link>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="card p-5"><Car className="mb-4 size-5 text-brand" /><p className="text-2xl font-bold">{customer.vehicles.length}</p><p className="text-xs text-muted">Vehicles</p></div><div className="card p-5"><Wrench className="mb-4 size-5 text-blue-600" /><p className="text-2xl font-bold">{customer.repairOrders.length}</p><p className="text-xs text-muted">Lifetime visits</p></div><div className="card p-5"><CircleDollarSign className="mb-4 size-5 text-violet-600" /><p className="text-2xl font-bold">{money(lifetime)}</p><p className="text-xs text-muted">Lifetime value</p></div></div>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-5">
        <section className="card overflow-hidden"><div className="border-b p-5 font-bold">Vehicles</div><div className="grid gap-3 p-4 sm:grid-cols-2">{customer.vehicles.map((v) => <Link href={`/vehicles/${v.id}`} key={v.id} className="rounded-xl border p-4 hover:border-brand"><p className="font-bold">{v.year} {v.make} {v.model}</p><p className="mt-1 text-xs text-muted">{v.licensePlate} · {v.mileage.toLocaleString()} mi</p></Link>)}</div></section>
        <section className="card overflow-hidden"><div className="border-b p-5 font-bold">Service history</div>{customer.repairOrders.map((ro) => <Link href={`/repair-orders/${ro.id}`} key={ro.id} className="flex items-center justify-between border-t px-5 py-4 first:border-0 hover:bg-gray-50"><div><p className="text-sm font-bold text-brand">{ro.roNumber}</p><p className="text-xs text-muted">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model} · {ro.complaint}</p></div><StatusBadge status={ro.status} /></Link>)}</section>
      </div>
      <div className="space-y-5">
        <section className="card p-5"><h2 className="font-bold">Follow-up opportunities</h2><div className="mt-4 space-y-3">{customer.followUps.map((f) => <div key={f.id} className="rounded-xl bg-amber-50 p-3"><p className="text-sm font-semibold text-amber-900">{f.title}</p><p className="mt-1 text-xs text-amber-800/75">{f.details}</p></div>)}{!customer.followUps.length && <p className="text-sm text-muted">No open follow-ups.</p>}</div></section>
        <section className="card p-5"><h2 className="font-bold">AI call history</h2><div className="mt-4 space-y-3">{customer.calls.map((call) => <Link href={`/calls/${call.id}`} key={call.id} className="block rounded-xl border p-3 hover:border-brand"><p className="text-sm font-semibold">{call.outcome?.toLowerCase().replaceAll("_", " ")}</p><p className="mt-1 line-clamp-2 text-xs text-muted">{call.summary}</p><p className="mt-1 text-[10px] text-muted">{call.startedAt.toLocaleString()} · {call.durationSec}s</p></Link>)}{!customer.calls.length && <p className="text-sm text-muted">No calls captured.</p>}</div></section>
        <section className="card p-5"><h2 className="font-bold">Recent messages</h2><div className="mt-4 space-y-3">{customer.messages.map((m) => <div key={m.id}><p className="text-sm">{m.body}</p><p className="mt-1 text-[11px] text-muted">{m.createdAt.toLocaleDateString()} · {m.channel}</p></div>)}</div></section>
      </div>
    </div>
  </>;
}
