import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { ArrowRight, Bot, CheckCircle2, Wrench } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  }
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden bg-nav p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 size-[34rem] rounded-full border border-emerald-300/10 bg-emerald-300/5" />
        <div className="relative flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#21c3a7] text-xl font-black text-nav">Z</span><span className="text-2xl font-black">ZOL</span></div>
        <div className="relative max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-100"><Bot className="size-3.5" /> AI-powered shop operations</div>
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">One connected workflow from first call to final payment.</h1>
          <p className="mt-6 text-lg leading-8 text-white/60">Run appointments, diagnostics, inspections, approvals, repairs, payments, and customer follow-up from a single workspace.</p>
        </div>
        <div className="relative flex gap-8 text-sm text-white/65"><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#40d8bd]" /> Connected workflow</span><span className="flex items-center gap-2"><Wrench className="size-4 text-[#40d8bd]" /> Built for technicians</span></div>
      </section>
      <section className="flex items-center justify-center bg-[#f6f9f8] p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-brand text-lg font-black text-white">Z</span><span className="text-xl font-black">ZOL</span></div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Welcome back</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Sign in to your shop</h2>
          <p className="mt-2 text-sm text-muted">Use a seeded account to explore the complete demo.</p>
          <form action={login} className="card mt-8 space-y-5 p-6">
            <label className="block"><span className="mb-2 block text-xs font-bold">Email address</span><input className="input" type="email" name="email" defaultValue="owner@zol.demo" required /></label>
            <label className="block"><span className="mb-2 block text-xs font-bold">Password</span><input className="input" type="password" name="password" defaultValue="ZolDemo123!" minLength={8} required /></label>
            <button className="btn btn-primary w-full">Sign in <ArrowRight className="size-4" /></button>
          </form>
          <div className="mt-5 rounded-xl border border-dashed bg-white/60 p-4 text-xs text-muted"><strong className="text-foreground">Demo accounts</strong><br />Owner: owner@zol.demo · Technician: tech@zol.demo<br />Password: ZolDemo123!</div>
        </div>
      </section>
    </main>
  );
}
