import Link from "next/link";
import { redirect } from "next/navigation";
import { Car, FileText, LogOut, MessageSquare, Wrench } from "lucide-react";
import { signOut } from "@/auth";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/utils";

export default async function CustomerHome() {
  const session = await requireSession(["CUSTOMER"]);
  if (!session.user.customerId) redirect("/login");
  const customer = await prisma.customer.findFirst({
    where: { id: session.user.customerId, shopId: session.user.shopId },
    include: {
      vehicles: true,
      repairOrders: { include: { vehicle: true, estimates: { orderBy: { createdAt: "desc" } }, invoice: true }, orderBy: { updatedAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!customer) redirect("/login");
  async function logout() { "use server"; await signOut({ redirectTo: "/login" }); }
  return <main className="min-h-screen bg-[#eef4f3]"><header className="bg-nav text-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><Link href="/customer" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#21c3a7] font-black text-nav">Z</span><strong className="text-xl">ZOL</strong></Link><form action={logout}><button className="flex items-center gap-2 text-sm text-white/70"><LogOut className="size-4" /> Sign out</button></form></div></header><div className="mx-auto max-w-5xl space-y-5 px-4 py-8"><div><p className="text-xs font-bold uppercase tracking-wider text-brand">Customer garage</p><h1 className="mt-1 text-3xl font-bold">Welcome, {customer.firstName}</h1><p className="mt-1 text-sm text-muted">Track repairs, review estimates, see invoices, and read shop updates.</p></div><section className="grid gap-3 sm:grid-cols-2">{customer.vehicles.map((v) => <div key={v.id} className="card p-5"><Car className="mb-3 size-5 text-brand" /><p className="font-bold">{v.year} {v.make} {v.model}</p><p className="text-xs text-muted">{v.licensePlate} · {v.mileage.toLocaleString()} miles</p></div>)}</section><section className="card overflow-hidden"><div className="border-b p-5 font-bold">Repairs & approvals</div>{customer.repairOrders.map((ro) => <div key={ro.id} className="border-t p-5 first:border-0"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-brand"><Wrench className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="font-bold">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</p><span className="text-xs font-bold text-brand">{ro.status.toLowerCase().replaceAll("_", " ")}</span></div><p className="mt-1 text-sm text-muted">{ro.complaint}</p><div className="mt-3 flex flex-wrap gap-2">{ro.estimates.map((e) => <Link className="btn btn-secondary min-h-8 py-1 text-xs" key={e.id} href={`/portal/estimate/${e.portalToken}`}><FileText className="size-3" /> {e.estimateNumber} · {money(e.total)}</Link>)}{ro.invoice && <span className="btn btn-secondary min-h-8 py-1 text-xs">Invoice {ro.invoice.status.toLowerCase()} · {money(ro.invoice.total)}</span>}</div></div></div></div>)}</section><section className="card p-5"><h2 className="flex items-center gap-2 font-bold"><MessageSquare className="size-4 text-brand" /> Shop updates</h2><div className="mt-4 space-y-3">{customer.messages.map((m) => <div key={m.id} className="rounded-xl bg-slate-50 p-3 text-sm">{m.body}<p className="mt-1 text-[10px] text-muted">{m.createdAt.toLocaleString()}</p></div>)}</div></section></div></main>;
}
