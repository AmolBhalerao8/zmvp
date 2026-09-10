"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, Bot, CalendarDays, Car, ChevronDown, ClipboardCheck, CreditCard,
  FileText, Gauge, LayoutDashboard, Menu, MessageSquare, Package, PhoneCall, Receipt,
  Search, Settings, Users, Wrench, X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calls", label: "AI Receptionist", icon: PhoneCall },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/repair-orders", label: "Repair Orders", icon: Wrench },
  { href: "/inspections", label: "Inspections", icon: ClipboardCheck },
  { href: "/estimates", label: "Estimates", icon: FileText },
  { href: "/parts", label: "Parts", icon: Package },
  { href: "/technicians", label: "Technicians", icon: Gauge },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Sidebar({ pathname, close }: { pathname: string; close?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-nav text-white">
      <div className="flex h-20 items-center justify-between px-5">
        <Link href="/" onClick={close} className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#21c3a7] text-lg font-black text-nav">Z</span>
          <div><div className="text-xl font-black tracking-tight">ZOL</div><div className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-100/55">Shop OS</div></div>
        </Link>
        {close && <button onClick={close} aria-label="Close menu" className="p-2 md:hidden"><X className="size-5" /></button>}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-5">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={close} className={cn(
              "mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/66 hover:bg-white/7 hover:text-white",
              active && "bg-white/10 text-white shadow-[inset_3px_0_0_#21c3a7]",
            )}>
              <Icon className={cn("size-[18px]", active && "text-[#40d8bd]")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs text-white/45">ZOL Motorworks · Demo</div>
    </div>
  );
}

export function AppShell({
  user,
  notifications,
  signOutAction,
  children,
}: {
  user: { name?: string | null; role: string };
  notifications: number;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 md:block"><Sidebar pathname={pathname} /></aside>
      {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button className="absolute inset-0 bg-black/45" aria-label="Close menu" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[min(19rem,86vw)]"><Sidebar pathname={pathname} close={() => setMobileOpen(false)} /></aside></div>}
      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b bg-white/94 px-4 backdrop-blur md:px-7">
          <button onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-xl border md:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
          <Link href="/search" className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border bg-[#f7f9f9] px-3 text-sm text-muted md:max-w-md"><Search className="size-4" /><span className="truncate">Search customers, vehicles, ROs...</span><kbd className="ml-auto hidden rounded border bg-white px-1.5 py-0.5 text-[10px] md:block">⌘ K</kbd></Link>
          <Link href="/notifications" className="relative grid size-10 place-items-center rounded-xl border bg-white"><Bell className="size-[18px]" />{notifications > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#e75c46] text-[10px] font-bold text-white">{Math.min(9, notifications)}</span>}</Link>
          <details className="relative">
            <summary className="flex list-none items-center gap-2 rounded-xl border bg-white p-1.5 pr-2">
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-brand">{initials(user.name || "ZOL User")}</span>
              <span className="hidden text-left sm:block"><span className="block text-xs font-semibold">{user.name}</span><span className="block text-[10px] text-muted">{user.role.toLowerCase()}</span></span>
              <ChevronDown className="size-3.5 text-muted" />
            </summary>
            <div className="absolute right-0 mt-2 w-44 rounded-xl border bg-white p-1 shadow-xl">
              <Link href="/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50">Account settings</Link>
              <form action={signOutAction}><button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Sign out</button></form>
            </div>
          </details>
        </header>
        <main className="p-4 md:p-7">{children}</main>
      </div>
    </div>
  );
}
