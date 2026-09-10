import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, Bot, CalendarCheck, Car, Check, CheckCircle2,
  Clock3, MessageSquareText, PhoneCall, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireManager } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type Intake = {
  complaint?: string;
  symptoms?: string[];
  urgency?: string;
  serviceType?: string;
  preferredTime?: string;
  safetyAdvice?: string;
  source?: string;
  assignedTechnician?: string;
};

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireManager();
  const { id } = await params;
  const call = await prisma.callRecord.findFirst({
    where: { id, shopId: session.user.shopId },
    include: {
      customer: true,
      vehicle: true,
      appointment: { include: { technician: true } },
      conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!call) notFound();
  const intake = (call.extractedDetails || {}) as Intake;

  return (
    <>
      <Link href="/calls" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-muted"><ArrowLeft className="size-3.5" /> AI Receptionist</Link>
      <PageHeader
        eyebrow="AI voice call completed"
        title={`${call.callerName || "Unknown caller"} · ${call.durationSec || 0}s`}
        description={`${call.startedAt.toLocaleString()} · Incoming call answered by Ava`}
        action={<StatusBadge status={call.outcome || call.status} className="px-3 py-1.5" />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4"><UserRound className="mb-3 size-5 text-brand" /><p className="font-bold">{call.customer ? `${call.customer.firstName} ${call.customer.lastName}` : "New caller"}</p><p className="text-xs text-muted">Customer identified</p></div>
        <div className="card p-4"><Car className="mb-3 size-5 text-blue-600" /><p className="font-bold">{call.vehicle ? `${call.vehicle.year} ${call.vehicle.make} ${call.vehicle.model}` : "Not identified"}</p><p className="text-xs text-muted">Vehicle matched to CRM</p></div>
        <div className="card p-4"><Sparkles className="mb-3 size-5 text-violet-600" /><p className="font-bold">{intake.urgency?.toLowerCase().replace("_", " ") || "Routine"}</p><p className="text-xs text-muted">AI intake priority</p></div>
        <div className="card p-4"><CalendarCheck className="mb-3 size-5 text-emerald-600" /><p className="font-bold">{call.appointment ? call.appointment.scheduledAt.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "Not booked"}</p><p className="text-xs text-muted">Availability booked</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b p-5"><div><h2 className="flex items-center gap-2 font-bold"><MessageSquareText className="size-4 text-brand" /> Full call transcript</h2><p className="mt-1 text-xs text-muted">Automatically attached to the customer communication history</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">TRANSCRIBED</span></div>
            <div className="space-y-4 p-5">
              {call.conversation?.messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === "customer" ? "flex-row-reverse" : ""}`}>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full ${message.role === "customer" ? "bg-slate-100" : "bg-emerald-50 text-brand"}`}>{message.role === "customer" ? <UserRound className="size-4" /> : <Bot className="size-4" />}</span>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "customer" ? "rounded-tr-sm bg-nav text-white" : "rounded-tl-sm border bg-white"}`}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-55">{message.role === "customer" ? call.callerName : "Ava · AI Receptionist"}</p>
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-brand" /><h2 className="font-bold">AI-extracted service intake</h2><span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted">{intake.source || "structured AI"}</span></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Primary concern</p><p className="mt-1 text-sm font-semibold">{intake.complaint || call.summary}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Service requested</p><p className="mt-1 text-sm font-semibold">{intake.serviceType}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Symptoms captured</p><div className="mt-2 flex flex-wrap gap-1.5">{intake.symptoms?.map((symptom) => <span key={symptom} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{symptom}</span>)}</div></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Preferred time</p><p className="mt-1 text-sm font-semibold">{intake.preferredTime}</p></div>
            </div>
            {intake.safetyAdvice && <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{intake.safetyAdvice} AI collected symptoms and provided safety guidance; technician diagnosis is still required.</div>}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card overflow-hidden">
            <div className="border-b p-5"><h2 className="flex items-center gap-2 font-bold"><CalendarCheck className="size-4 text-brand" /> Automatic booking</h2></div>
            {call.appointment ? <div className="p-5"><div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-brand">Best available match</p><p className="mt-2 text-2xl font-bold">{call.appointment.scheduledAt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p><p className="mt-1 text-lg font-semibold">{call.appointment.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p><div className="mt-4 border-t border-emerald-200 pt-4 text-sm"><p><strong>{call.appointment.technician?.name}</strong> · Diagnostics specialist</p><p className="mt-1 text-xs text-muted">60-minute bay reserved · No scheduling conflicts</p></div></div><div className="mt-4 space-y-2 text-xs"><p className="flex items-center gap-2"><Check className="size-3.5 text-brand" /> Technician availability checked</p><p className="flex items-center gap-2"><Check className="size-3.5 text-brand" /> Appointment created in shop calendar</p><p className="flex items-center gap-2"><Check className="size-3.5 text-brand" /> SMS confirmation sent to customer</p></div><Link href="/appointments" className="btn btn-secondary mt-4 w-full">View shop calendar</Link></div> : <p className="p-5 text-sm text-muted">No appointment was created from this call.</p>}
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold"><PhoneCall className="size-4 text-brand" /> Customer communication journey</h2>
            <div className="relative mt-5 space-y-5 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-line">
              {[
                ["Call answered", "Ava responded immediately", true],
                ["Booking confirmed", "SMS with date, time, and service", true],
                ["Vehicle checked in", "Automatic arrival notification", false],
                ["Estimate ready", "Inspection and approval link", false],
                ["Repair updates", "Approval, parts, and completion status", false],
                ["Ready for pickup", "Invoice and payment link", false],
              ].map(([title, detail, done]) => <div key={title as string} className="relative flex gap-3"><span className={`z-10 grid size-7 shrink-0 place-items-center rounded-full ${done ? "bg-brand text-white" : "border bg-white text-muted"}`}>{done ? <Check className="size-3.5" /> : <Clock3 className="size-3.5" />}</span><div><p className="text-sm font-semibold">{title as string}</p><p className="text-xs text-muted">{detail as string}</p></div></div>)}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-brand" /><div><p className="text-sm font-bold text-emerald-950">CRM updated automatically</p><p className="mt-1 text-xs leading-5 text-emerald-900/70">The call, transcript, concern, vehicle, appointment, and confirmation are connected to {call.callerName}&apos;s customer record.</p>{call.customer && <Link href={`/customers/${call.customer.id}`} className="mt-2 inline-flex text-xs font-bold text-brand">Open customer profile →</Link>}</div></div></section>
        </aside>
      </div>
    </>
  );
}
