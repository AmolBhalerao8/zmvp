import Link from "next/link";
import { Bot, CalendarCheck, Clock3, PhoneCall, Play, Sparkles } from "lucide-react";
import { createDemoReceptionistCall } from "@/app/actions";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireManager } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const session = await requireManager();
  const calls = await prisma.callRecord.findMany({
    where: { shopId: session.user.shopId },
    include: { customer: true, vehicle: true, appointment: true },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  const booked = calls.filter((call) => call.outcome === "APPOINTMENT_BOOKED").length;
  const answered = calls.filter((call) => call.status === "COMPLETED").length;
  const answerRate = calls.length ? Math.round((answered / calls.length) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="24/7 AI voice intake"
        title="AI Receptionist"
        description="Ava answers calls, asks safe intake questions, captures the transcript, checks technician availability, books service, and sends confirmation."
        action={
          <form action={createDemoReceptionistCall}>
            <button className="btn btn-primary"><Play className="size-4" /> Simulate incoming call</button>
          </form>
        }
      />

      <section className="card mb-5 overflow-hidden bg-gradient-to-r from-[#102b29] to-[#17685d] text-white">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-4">
            <span className="relative grid size-14 place-items-center rounded-2xl bg-white/10">
              <span className="absolute inset-0 animate-ping rounded-2xl bg-emerald-300/10" />
              <Bot className="size-7 text-[#64e4cd]" />
            </span>
            <div>
              <div className="flex items-center gap-2"><h2 className="text-xl font-bold">Ava is online</h2><span className="rounded-full bg-emerald-300/15 px-2 py-1 text-[10px] font-bold text-emerald-200">ANSWERING 24/7</span></div>
              <p className="mt-1 text-sm text-white/60">Voice provider: interactive web demo · Safe intake, not definitive diagnosis</p>
            </div>
          </div>
          <div className="flex gap-6 text-center text-sm"><div><strong className="block text-2xl">{answerRate}%</strong><span className="text-xs text-white/50">Answer rate</span></div><div><strong className="block text-2xl">{booked}</strong><span className="text-xs text-white/50">Jobs booked</span></div></div>
        </div>
      </section>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card p-5"><PhoneCall className="mb-4 size-5 text-brand" /><p className="text-2xl font-bold">{calls.length}</p><p className="text-xs text-muted">Calls captured</p></div>
        <div className="card p-5"><CalendarCheck className="mb-4 size-5 text-blue-600" /><p className="text-2xl font-bold">{booked}</p><p className="text-xs text-muted">Appointments booked</p></div>
        <div className="card p-5"><Clock3 className="mb-4 size-5 text-violet-600" /><p className="text-2xl font-bold">{calls.reduce((sum, call) => sum + (call.durationSec || 0), 0) ? Math.round(calls.reduce((sum, call) => sum + (call.durationSec || 0), 0) / Math.max(1, calls.length)) : 0}s</p><p className="text-xs text-muted">Average call duration</p></div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold">Call intelligence</h2><p className="text-xs text-muted">Transcript, extracted details, booking outcome, and customer follow-through</p></div><Sparkles className="size-4 text-brand" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8fafa] text-[11px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Caller</th><th className="px-4 py-3">Vehicle & concern</th><th className="px-4 py-3">Outcome</th><th className="px-4 py-3">Appointment</th><th className="px-4 py-3">Received</th></tr></thead>
            <tbody>{calls.map((call) => <tr key={call.id} className="table-row hover:bg-[#fbfcfc]"><td className="px-5 py-4"><Link href={`/calls/${call.id}`} className="font-bold text-brand">{call.callerName || "Unknown caller"}</Link><p className="text-xs text-muted">{call.callerPhone} · {call.durationSec || 0}s</p></td><td className="px-4 py-4"><p className="font-semibold">{call.vehicle ? `${call.vehicle.year} ${call.vehicle.make} ${call.vehicle.model}` : "Vehicle not identified"}</p><p className="max-w-sm truncate text-xs text-muted">{call.summary}</p></td><td className="px-4 py-4"><StatusBadge status={call.outcome || call.status} /></td><td className="px-4 py-4">{call.appointment ? <><p className="font-semibold">{call.appointment.scheduledAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {call.appointment.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p><p className="text-xs text-muted">{call.appointment.status.toLowerCase()}</p></> : "—"}</td><td className="px-4 py-4 text-xs text-muted">{call.startedAt.toLocaleString()}</td></tr>)}</tbody>
          </table>
        </div>
        {!calls.length && <div className="grid min-h-52 place-items-center text-center"><div><PhoneCall className="mx-auto mb-3 size-8 text-muted" /><p className="font-semibold">No calls yet</p><p className="mt-1 text-sm text-muted">Simulate a call to see Ava complete the intake workflow.</p></div></div>}
      </section>
    </>
  );
}
