import { CreditCard } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireManager } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";
export default async function PaymentsPage() {
  const session = await requireManager();
  const payments = await prisma.payment.findMany({ where: { shopId: session.user.shopId }, include: { invoice: { include: { customer: true, vehicle: true } } }, orderBy: { createdAt: "desc" } });
  const total = payments.filter((p) => p.status === "SUCCEEDED").reduce((s, p) => s + Number(p.amount), 0);
  return <><PageHeader eyebrow="Transactions" title="Payments" description="Payment records only—ZOL never stores raw card information." /><div className="mb-5 card flex items-center gap-4 p-5"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-brand"><CreditCard className="size-5" /></span><div><p className="text-2xl font-bold">{money(total)}</p><p className="text-xs text-muted">Successful payments shown</p></div><span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{process.env.STRIPE_SECRET_KEY ? "Stripe test mode" : "Demo provider"}</span></div><div className="card overflow-hidden">{payments.map((p) => <div key={p.id} className="grid gap-3 border-t px-5 py-4 first:border-0 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center"><div><p className="font-bold">{p.invoice.customer.firstName} {p.invoice.customer.lastName}</p><p className="text-xs text-muted">{p.invoice.vehicle.year} {p.invoice.vehicle.make} {p.invoice.vehicle.model}</p></div><div><p className="text-sm font-semibold">{p.invoice.invoiceNumber}</p><p className="text-xs text-muted">{p.method} · {p.provider}</p></div><StatusBadge status={p.status} /><p className="font-bold">{money(p.amount)}</p></div>)}</div></>;
}
