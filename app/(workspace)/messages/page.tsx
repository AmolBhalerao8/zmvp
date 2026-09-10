import { MessageSquare, Send } from "lucide-react";
import { sendMessage } from "@/app/actions";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const session = await requireStaff(); const query = await searchParams;
  const [messages, customers] = await Promise.all([
    prisma.message.findMany({ where: { shopId: session.user.shopId }, include: { customer: true, repairOrder: true, sender: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.customer.findMany({ where: { shopId: session.user.shopId }, orderBy: { lastName: "asc" } }),
  ]);
  return <><PageHeader eyebrow="Unified inbox" title="Messages" description="Customer conversations and repair-order updates through a replaceable messaging provider." /><div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]"><section className="card p-5"><h2 className="font-bold">New customer message</h2><form action={sendMessage} className="mt-4 space-y-3"><select className="input" name="customerId" defaultValue={query.customer || ""} required><option value="" disabled>Choose customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} · {c.phone}</option>)}</select><textarea name="body" className="input min-h-28" placeholder="Write a customer update..." required /><button className="btn btn-primary w-full"><Send className="size-4" /> Send mock SMS</button></form><p className="mt-3 text-xs text-muted">Messages are persisted. Delivery uses the mock provider until Twilio or email is configured.</p></section><section className="card overflow-hidden"><div className="border-b p-5 font-bold">Recent activity</div><div className="divide-y">{messages.map((m) => <div key={m.id} className="flex gap-3 p-4"><span className={`grid size-9 shrink-0 place-items-center rounded-full ${m.direction === "INBOUND" ? "bg-slate-100" : "bg-emerald-50 text-brand"}`}><MessageSquare className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="text-sm font-bold">{m.customer ? `${m.customer.firstName} ${m.customer.lastName}` : "Internal note"}</p><p className="text-[10px] text-muted">{m.createdAt.toLocaleString()}</p></div><p className="mt-1 text-sm text-muted">{m.body}</p><p className="mt-1 text-[10px] font-semibold text-muted">{m.channel} · {m.repairOrder?.roNumber || "General"}</p></div></div>)}</div></section></div></>;
}
