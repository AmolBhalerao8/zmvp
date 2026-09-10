import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Bot, Check, ClipboardCheck, CreditCard, FileText, Package, Plus, Send } from "lucide-react";
import {
  addPart, createEstimate, createInspection, generateInspectionSummary, generateInvoice,
  payInvoice, runDiagnostic, sendMessage, updateInspectionItem, updatePartStatus, updateRepairOrderStatus,
} from "@/app/actions";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { humanize, money } from "@/lib/utils";

const statuses = ["NEW", "CHECKED_IN", "DIAGNOSING", "AWAITING_APPROVAL", "WAITING_FOR_PARTS", "IN_REPAIR", "QUALITY_CHECK", "READY_FOR_PICKUP", "COMPLETED", "CLOSED"] as const;
type DiagnosticJson = { causes?: Array<{ title: string; confidence: number; explanation: string }>; diagnosticSteps?: string[]; steps?: string[]; warnings?: string[]; warning?: string };

export default async function RepairOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff(); const { id } = await params;
  const ro = await prisma.repairOrder.findFirst({
    where: { id, shopId: session.user.shopId },
    include: {
      customer: true, vehicle: true, technician: true,
      diagnostics: { orderBy: { createdAt: "desc" } },
      inspections: { include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: { createdAt: "desc" } },
      estimates: { include: { items: true }, orderBy: { createdAt: "desc" } },
      parts: { orderBy: { createdAt: "desc" } }, labor: true,
      invoice: { include: { items: true, payments: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ro) notFound();
  const currentIndex = statuses.indexOf(ro.status);
  return <>
    <Link href="/repair-orders" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-muted"><ArrowLeft className="size-3.5" /> Repair orders</Link>
    <PageHeader eyebrow={ro.roNumber} title={`${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`} description={`${ro.customer.firstName} ${ro.customer.lastName} · ${ro.mileageIn.toLocaleString()} mi · ${ro.vehicle.licensePlate}`} action={<form action={updateRepairOrderStatus} className="flex gap-2"><input type="hidden" name="repairOrderId" value={ro.id} /><select name="status" defaultValue={ro.status} className="input min-w-44">{statuses.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select><button className="btn btn-primary">Update</button></form>} />

    <section className="card mb-5 overflow-hidden p-5">
      <div className="mobile-scroll flex min-w-max items-start">
        {statuses.map((status, index) => <div key={status} className="flex items-start"><div className="w-28 text-center"><div className={`mx-auto grid size-7 place-items-center rounded-full border-2 text-xs font-bold ${index <= currentIndex ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-400"}`}>{index < currentIndex ? <Check className="size-3.5" /> : index + 1}</div><p className={`mt-2 text-[10px] font-bold ${index <= currentIndex ? "text-brand" : "text-muted"}`}>{humanize(status)}</p></div>{index < statuses.length - 1 && <div className={`mt-3 h-0.5 w-6 ${index < currentIndex ? "bg-brand" : "bg-slate-200"}`} />}</div>)}
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
      <div className="space-y-5">
        <section className="card p-5"><h2 className="font-bold">Customer concern</h2><p className="mt-3 text-sm leading-6">{ro.complaint}</p>{ro.checkInNotes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-muted">{ro.checkInNotes}</p>}</section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b p-5"><div><h2 className="flex items-center gap-2 font-bold"><Bot className="size-4 text-brand" /> AI diagnostic assistant</h2><p className="mt-1 text-xs text-muted">Structured guidance based on technician-entered facts.</p></div></div>
          <form action={runDiagnostic} className="grid gap-3 border-b bg-[#fbfcfc] p-5 md:grid-cols-2"><input type="hidden" name="repairOrderId" value={ro.id} /><input name="obdCodes" className="input" placeholder="OBD codes, e.g. P0301 P0171" /><input name="symptoms" className="input" placeholder="Symptoms observed" required /><textarea name="observations" className="input md:col-span-2" placeholder="Technician observations, test readings, history..." /><button className="btn btn-primary md:w-fit"><Bot className="size-4" /> Analyze symptoms</button></form>
          <div className="space-y-4 p-5">{ro.diagnostics.map((d) => {
            const result = (d.aiResult || {}) as DiagnosticJson;
            return <div key={d.id} className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold text-muted">{d.obdCodes.join(" · ") || "No codes"} · {d.createdAt.toLocaleString()}</p><StatusBadge status={d.aiStatus || "COMPLETED"} /></div><div className="space-y-2">{result.causes?.map((cause) => <div key={cause.title} className="rounded-lg bg-slate-50 p-3"><div className="flex justify-between gap-2"><p className="text-sm font-bold">{cause.title}</p><span className="text-xs font-bold text-brand">{cause.confidence}%</span></div><p className="mt-1 text-xs leading-5 text-muted">{cause.explanation}</p></div>)}</div><ol className="mt-4 list-inside list-decimal space-y-1 text-xs text-muted">{(result.diagnosticSteps || result.steps || []).map((step) => <li key={step}>{step}</li>)}</ol><div className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-800"><AlertTriangle className="size-4 shrink-0" />AI-assisted diagnostic recommendation — technician verification required.</div></div>;
          })}{!ro.diagnostics.length && <p className="text-sm text-muted">No diagnostic analysis yet. Add scan data and technician observations above.</p>}</div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b p-5"><div><h2 className="flex items-center gap-2 font-bold"><ClipboardCheck className="size-4 text-brand" /> Digital inspection</h2><p className="mt-1 text-xs text-muted">Fast color-coded vehicle health check.</p></div>{!ro.inspections.length && <form action={createInspection}><input type="hidden" name="repairOrderId" value={ro.id} /><button className="btn btn-secondary"><Plus className="size-4" /> Start inspection</button></form>}</div>
          {ro.inspections.map((inspection) => <div key={inspection.id}><div className="grid gap-2 p-4 md:grid-cols-2">{inspection.items.map((item) => <form action={updateInspectionItem} key={item.id} className="rounded-xl border p-3"><input type="hidden" name="itemId" value={item.id} /><div className="flex items-center gap-2"><p className="min-w-0 flex-1 text-sm font-bold">{item.category}</p><select name="rating" defaultValue={item.rating} className="rounded-lg border px-2 py-1 text-xs"><option value="NOT_INSPECTED">Not checked</option><option value="GREEN">Green</option><option value="YELLOW">Yellow</option><option value="RED">Red</option></select></div><div className="mt-2 flex gap-2"><input name="measurement" defaultValue={item.measurement || ""} className="input py-1.5 text-xs" placeholder="Measurement" /><input name="notes" defaultValue={item.notes || ""} className="input py-1.5 text-xs" placeholder="Notes" /><button className="btn btn-secondary min-h-8 px-2 py-1 text-xs">Save</button></div></form>)}</div><div className="flex items-center justify-between border-t bg-emerald-50/40 p-4"><p className="max-w-2xl text-xs text-muted">{inspection.aiSummary || "Complete findings, then generate a customer-friendly summary based only on entered data."}</p><form action={generateInspectionSummary}><input type="hidden" name="inspectionId" value={inspection.id} /><button className="btn btn-secondary whitespace-nowrap"><Bot className="size-4" /> Summarize</button></form></div></div>)}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b p-5"><h2 className="flex items-center gap-2 font-bold"><FileText className="size-4 text-brand" /> Estimates & approval</h2></div>
          <form action={createEstimate} className="grid gap-2 border-b bg-[#fbfcfc] p-4 md:grid-cols-[1fr_120px_1fr_120px_auto]"><input type="hidden" name="repairOrderId" value={ro.id} /><input name="laborDescription" className="input" placeholder="Labor description" required /><input name="laborAmount" type="number" step="0.01" className="input" placeholder="$ Labor" required /><input name="partDescription" className="input" placeholder="Part description" required /><input name="partAmount" type="number" step="0.01" className="input" placeholder="$ Parts" required /><button className="btn btn-primary">Send estimate</button></form>
          {ro.estimates.map((estimate) => <div key={estimate.id} className="flex flex-col gap-3 border-t px-5 py-4 first:border-0 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-bold">{estimate.estimateNumber}</p><p className="text-xs text-muted">{estimate.items.map((i) => i.description).join(" · ")}</p></div><StatusBadge status={estimate.status} /><strong>{money(estimate.total)}</strong><Link href={`/portal/estimate/${estimate.portalToken}`} target="_blank" className="btn btn-secondary"><Send className="size-3.5" /> Portal</Link></div>)}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b p-5"><h2 className="flex items-center gap-2 font-bold"><Package className="size-4 text-brand" /> Parts workflow</h2></div>
          <form action={addPart} className="grid gap-2 border-b bg-[#fbfcfc] p-4 md:grid-cols-3"><input type="hidden" name="repairOrderId" value={ro.id} /><input name="name" className="input" placeholder="Part name" required /><input name="partNumber" className="input" placeholder="Part number" /><input name="supplier" className="input" placeholder="Supplier" /><input name="cost" type="number" step="0.01" className="input" placeholder="Cost" required /><input name="price" type="number" step="0.01" className="input" placeholder="Customer price" required /><button className="btn btn-primary">Add part</button></form>
          {ro.parts.map((part) => <form action={updatePartStatus} key={part.id} className="flex items-center gap-3 border-t px-5 py-4 first:border-0"><input type="hidden" name="partId" value={part.id} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{part.name}</p><p className="text-xs text-muted">{part.partNumber} · {part.supplier} · {money(part.unitPrice)}</p></div><select name="status" defaultValue={part.status} className="input max-w-40">{["NEEDED", "REQUESTED", "ORDERED", "RECEIVED", "INSTALLED", "RETURNED"].map((s) => <option key={s}>{s}</option>)}</select><button className="btn btn-secondary">Update</button></form>)}
        </section>
      </div>

      <aside className="space-y-5">
        <section className="card p-5"><h2 className="font-bold">Job details</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted">Status</dt><dd><StatusBadge status={ro.status} /></dd></div><div className="flex justify-between"><dt className="text-muted">Technician</dt><dd className="font-semibold">{ro.technician?.name || "Unassigned"}</dd></div><div className="flex justify-between"><dt className="text-muted">Fuel</dt><dd>{ro.fuelLevel ?? "—"}%</dd></div><div className="flex justify-between"><dt className="text-muted">Checked in</dt><dd>{ro.checkedInAt?.toLocaleDateString() || "—"}</dd></div></dl></section>
        <section className="card overflow-hidden"><div className="border-b p-5"><h2 className="flex items-center gap-2 font-bold"><CreditCard className="size-4 text-brand" /> Invoice</h2></div>{ro.invoice ? <div className="p-5"><div className="flex justify-between"><div><p className="font-bold">{ro.invoice.invoiceNumber}</p><StatusBadge status={ro.invoice.status} /></div><p className="text-xl font-bold">{money(ro.invoice.total)}</p></div>{ro.invoice.status !== "PAID" && <form action={payInvoice} className="mt-4"><input type="hidden" name="invoiceId" value={ro.invoice.id} /><button className="btn btn-primary w-full">Collect {process.env.STRIPE_SECRET_KEY ? "Stripe" : "demo"} payment</button></form>}</div> : <div className="p-5"><p className="mb-4 text-xs text-muted">Generate an invoice from the latest approved estimate.</p><form action={generateInvoice}><input type="hidden" name="repairOrderId" value={ro.id} /><button className="btn btn-primary w-full">Generate invoice</button></form></div>}</section>
        <section className="card overflow-hidden"><div className="border-b p-5"><h2 className="font-bold">Conversation</h2></div><div className="max-h-72 space-y-3 overflow-y-auto p-4">{ro.messages.map((m) => <div key={m.id} className={`rounded-xl p-3 text-xs ${m.direction === "INBOUND" ? "mr-5 bg-slate-100" : "ml-5 bg-emerald-50 text-emerald-900"}`}>{m.body}<p className="mt-1 text-[10px] opacity-60">{m.createdAt.toLocaleString()}</p></div>)}</div><form action={sendMessage} className="flex gap-2 border-t p-3"><input type="hidden" name="customerId" value={ro.customerId} /><input type="hidden" name="repairOrderId" value={ro.id} /><input name="body" className="input" placeholder="Message customer..." required /><button aria-label="Send" className="btn btn-primary px-3"><Send className="size-4" /></button></form></section>
      </aside>
    </div>
  </>;
}
