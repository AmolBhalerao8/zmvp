import Link from "next/link";
import { CreditCard } from "lucide-react";
import { payInvoice } from "@/app/actions";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";
export default async function InvoicesPage() {
  const session = await requireStaff();
  const invoices = await prisma.invoice.findMany({ where: { shopId: session.user.shopId }, include: { customer: true, vehicle: true, repairOrder: true, payments: true }, orderBy: { createdAt: "desc" } });
  return <><PageHeader eyebrow="Billing" title="Invoices" description="Approved work converted into connected invoices with Stripe test or demo payment support." /><div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f8fafa] text-[11px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Invoice</th><th className="px-4 py-3">Customer / Vehicle</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} className="table-row"><td className="px-5 py-4"><Link href={`/repair-orders/${invoice.repairOrderId}`} className="font-bold text-brand">{invoice.invoiceNumber}</Link><p className="text-xs text-muted">{invoice.repairOrder.roNumber} · {invoice.createdAt.toLocaleDateString()}</p></td><td className="px-4 py-4">{invoice.customer.firstName} {invoice.customer.lastName}<p className="text-xs text-muted">{invoice.vehicle.year} {invoice.vehicle.make} {invoice.vehicle.model}</p></td><td className="px-4 py-4"><StatusBadge status={invoice.status} /></td><td className="px-4 py-4 font-bold">{money(invoice.total)}</td><td className="px-4 py-4">{invoice.status !== "PAID" ? <form action={payInvoice}><input type="hidden" name="invoiceId" value={invoice.id} /><button className="btn btn-primary min-h-8 px-2 py-1 text-xs"><CreditCard className="size-3" /> Demo pay</button></form> : <span className="text-xs text-muted">{invoice.paidAt?.toLocaleString()}</span>}</td></tr>)}</tbody></table></div></div></>;
}
