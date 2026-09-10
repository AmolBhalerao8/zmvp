import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn, humanize } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  GREEN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 ring-slate-200",
  RED: "bg-red-50 text-red-700 ring-red-200",
  DECLINED: "bg-red-50 text-red-700 ring-red-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
  YELLOW: "bg-amber-50 text-amber-700 ring-amber-200",
  AWAITING_APPROVAL: "bg-amber-50 text-amber-700 ring-amber-200",
  WAITING_FOR_PARTS: "bg-violet-50 text-violet-700 ring-violet-200",
  ORDERED: "bg-violet-50 text-violet-700 ring-violet-200",
  IN_REPAIR: "bg-blue-50 text-blue-700 ring-blue-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
  DIAGNOSING: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  READY_FOR_PICKUP: "bg-teal-50 text-teal-700 ring-teal-200",
  OPEN: "bg-blue-50 text-blue-700 ring-blue-200",
  SENT: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset", statusStyles[status] || "bg-slate-50 text-slate-600 ring-slate-200", className)}>{humanize(status)}</span>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "green" }: { label: string; value: string | number; detail?: string; icon: LucideIcon; tone?: "green" | "blue" | "amber" | "violet" }) {
  const colors = { green: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" };
  return <div className="card p-4"><div className="mb-4 flex items-start justify-between"><span className={cn("grid size-9 place-items-center rounded-xl", colors[tone])}><Icon className="size-[18px]" /></span>{detail && <span className="text-[11px] font-medium text-muted">{detail}</span>}</div><div className="text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs font-medium text-muted">{label}</div></div>;
}

export function SectionHeader({ title, detail, href }: { title: string; detail?: string; href?: string }) {
  return <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold">{title}</h2>{detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}</div>{href && <Link href={href} className="flex items-center gap-1 text-xs font-bold text-brand">View all <ArrowUpRight className="size-3.5" /></Link>}</div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="grid min-h-40 place-items-center p-8 text-center"><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted">{detail}</p></div></div>;
}
