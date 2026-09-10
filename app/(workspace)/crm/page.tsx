import Link from "next/link";
import { Bot, CalendarClock, MessageSquare, PhoneCall } from "lucide-react";
import { generateFollowUpDraft } from "@/app/actions";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireManager } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export default async function CRMPage() {
  const session = await requireManager();
  const [followUps, calls] = await Promise.all([
    prisma.cRMFollowUp.findMany({ where: { shopId: session.user.shopId }, include: { customer: true, vehicle: true, repairOrder: true }, orderBy: [{ status: "asc" }, { dueAt: "asc" }] }),
    prisma.callRecord.findMany({ where: { shopId: session.user.shopId }, include: { customer: true, vehicle: true, appointment: true }, orderBy: { startedAt: "desc" }, take: 3 }),
  ]);
  return <>
    <PageHeader eyebrow="Customer retention" title="Automotive CRM" description="Call intelligence, communication history, declined services, maintenance schedules, and post-repair care in one customer record." />
    <div className="mb-5 grid gap-3 sm:grid-cols-4">{["OPEN", "SCHEDULED", "SENT", "COMPLETED"].map((status) => <div className="card p-4" key={status}><p className="text-2xl font-bold">{followUps.filter((f) => f.status === status).length}</p><p className="text-xs text-muted">{status.toLowerCase()} follow-ups</p></div>)}</div>
    {calls.length > 0 && <section className="card mb-5 overflow-hidden"><div className="flex items-center justify-between border-b p-5"><div><h2 className="flex items-center gap-2 font-bold"><PhoneCall className="size-4 text-brand" /> Recent AI call intelligence</h2><p className="mt-1 text-xs text-muted">Transcripts and extracted service details attached automatically</p></div><Link href="/calls" className="text-xs font-bold text-brand">View call center →</Link></div><div className="grid gap-px bg-line md:grid-cols-3">{calls.map((call) => <Link href={`/calls/${call.id}`} key={call.id} className="bg-white p-5 hover:bg-emerald-50/30"><div className="flex items-center justify-between"><p className="font-bold">{call.callerName}</p><StatusBadge status={call.outcome || call.status} /></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{call.summary}</p><p className="mt-3 text-[10px] font-semibold text-muted">{call.vehicle ? `${call.vehicle.year} ${call.vehicle.make} ${call.vehicle.model}` : "Vehicle not matched"} · {call.durationSec}s</p></Link>)}</div></section>}
    <div className="grid gap-4 lg:grid-cols-2">{followUps.map((f) => <section key={f.id} className="card p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><CalendarClock className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><h2 className="font-bold">{f.title}</h2><p className="text-xs text-muted"><Link className="text-brand" href={`/customers/${f.customerId}`}>{f.customer.firstName} {f.customer.lastName}</Link>{f.vehicle && ` · ${f.vehicle.year} ${f.vehicle.make} ${f.vehicle.model}`}</p></div><StatusBadge status={f.status} /></div><p className="mt-3 text-sm leading-6 text-muted">{f.details}</p>{f.aiDraft && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"><Bot className="mr-1 inline size-3.5" />{f.aiDraft}</div>}<div className="mt-4 flex items-center justify-between"><p className="text-xs font-semibold text-muted">Due {f.dueAt?.toLocaleDateString() || "anytime"}</p><div className="flex gap-2">{!f.aiDraft && <form action={generateFollowUpDraft}><input type="hidden" name="followUpId" value={f.id} /><button className="btn btn-secondary min-h-8 px-2 py-1 text-xs"><Bot className="size-3" /> AI draft</button></form>}<Link href={`/messages?customer=${f.customerId}`} className="btn btn-primary min-h-8 px-2 py-1 text-xs"><MessageSquare className="size-3" /> Contact</Link></div></div></div></div></section>)}</div>
  </>;
}
