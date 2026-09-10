"use client";

import { useState } from "react";
import { Bot, Send, Wrench } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };
export default function ReceptionistPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Hi! I’m ZOL’s service assistant. Tell me about your vehicle and what’s going on, and I’ll help you prepare for an appointment." }]);
  const [loading, setLoading] = useState(false);
  async function submit(formData: FormData) {
    const content = String(formData.get("message") || "").trim(); if (!content) return;
    const next = [...messages, { role: "user" as const, content }]; setMessages(next); setLoading(true);
    try {
      const response = await fetch("/api/receptionist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content, history: next.slice(-12) }) });
      const result = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: result.reply || "I couldn’t process that. Please call the shop for help." }]);
    } catch { setMessages((current) => [...current, { role: "assistant", content: "I’m temporarily unavailable. Please call ZOL Motorworks at (530) 555-0147." }]); }
    setLoading(false);
  }
  return <main className="grid min-h-screen bg-[#edf4f3] lg:grid-cols-[.75fr_1.25fr]"><section className="hidden bg-nav p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#21c3a7] font-black text-nav">Z</span><strong className="text-xl">ZOL</strong></div><div><Wrench className="mb-5 size-9 text-[#40d8bd]" /><h1 className="text-4xl font-bold">How can we help get you back on the road?</h1><p className="mt-4 leading-7 text-white/60">Describe the concern in your own words. We’ll ask a few useful questions and help coordinate the right service.</p></div><p className="text-xs text-white/40">Not for emergencies. If the vehicle is unsafe, stop driving and seek immediate assistance.</p></section><section className="flex flex-col"><header className="flex items-center gap-3 border-b bg-white p-5"><span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-brand"><Bot className="size-5" /></span><div><p className="font-bold">ZOL Service Assistant</p><p className="text-xs text-emerald-700">Online · AI-assisted</p></div></header><div className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-4 md:p-8"><div className="flex-1 space-y-4">{messages.map((m, index) => <div key={index} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === "user" ? "ml-auto rounded-br-md bg-brand text-white" : "rounded-bl-md border bg-white"}`}>{m.content}</div>)}{loading && <div className="w-fit rounded-2xl border bg-white px-4 py-3 text-sm text-muted">Thinking…</div>}</div><form action={submit} className="sticky bottom-4 mt-6 flex gap-2 rounded-2xl border bg-white p-2 shadow-lg"><input name="message" className="min-w-0 flex-1 px-3 text-sm outline-none" placeholder="Describe your vehicle concern..." autoComplete="off" /><button disabled={loading} className="btn btn-primary px-3" aria-label="Send"><Send className="size-4" /></button></form></div></section></main>;
}
