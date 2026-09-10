import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/utils";
import { createCustomer } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; new?: string }> }) {
  const session = await requireStaff();
  const params = await searchParams;
  const q = params.q?.trim();
  const customers = await prisma.customer.findMany({
    where: { shopId: session.user.shopId, ...(q ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    include: { _count: { select: { vehicles: true, repairOrders: true } }, invoices: { where: { status: "PAID" }, select: { total: true } } },
    orderBy: { lastName: "asc" },
  });
  return <>
    <PageHeader eyebrow="Relationships" title="Customers" description={`${customers.length} customer records with connected vehicles, service history, and lifetime value.`} action={<Link href="/customers?new=1" className="btn btn-primary"><Plus className="size-4" /> Add customer</Link>} />
    {params.new && <form action={createCustomer} className="card mb-5 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5"><input className="input" name="firstName" placeholder="First name" required /><input className="input" name="lastName" placeholder="Last name" required /><input className="input" name="phone" placeholder="Phone" required /><input className="input" name="email" type="email" placeholder="Email" /><button className="btn btn-primary">Save customer</button></form>}
    <form className="card mb-4 flex max-w-xl items-center gap-2 p-2"><Search className="ml-2 size-4 text-muted" /><input name="q" defaultValue={q} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none" placeholder="Search name, phone, or email" /><button className="btn btn-secondary min-h-9 py-1">Search</button></form>
    <div className="card overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f8fafa] text-[11px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Customer</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Vehicles</th><th className="px-4 py-3">Visits</th><th className="px-4 py-3">Lifetime value</th></tr></thead>
      <tbody>{customers.map((customer) => <tr key={customer.id} className="table-row hover:bg-[#fbfcfc]"><td className="px-5 py-4"><Link href={`/customers/${customer.id}`} className="font-bold text-brand">{customer.firstName} {customer.lastName}</Link><p className="mt-0.5 text-xs text-muted">Customer since {customer.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p></td><td className="px-4 py-4"><p>{customer.phone}</p><p className="text-xs text-muted">{customer.email}</p></td><td className="px-4 py-4">{customer._count.vehicles}</td><td className="px-4 py-4">{customer._count.repairOrders}</td><td className="px-4 py-4 font-semibold">{money(customer.invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0))}</td></tr>)}</tbody></table></div>
      {!customers.length && <div className="grid min-h-52 place-items-center text-center"><div><Users className="mx-auto mb-3 size-8 text-muted" /><p className="font-semibold">No customers found</p><p className="text-sm text-muted">Try a different search.</p></div></div>}
    </div>
  </>;
}
