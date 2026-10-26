"use client";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POINTS = ["Official Instagram API, no password sharing", "Free plan with 100 DMs a month, no card needed", "Set up your first automation in about 5 minutes"];

export default function AuthForm({ mode, appName, next }: { mode: "login" | "signup"; appName: string; next?: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const f = new FormData(e.currentTarget);
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(f)) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error || "Something went wrong"); setBusy(false); return; }
    // only same-site paths: never follow an absolute URL from the query string
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between"><Logo name={appName} /><ThemeToggle /></div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-4xl sm:text-5xl">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{signup ? "Start automating your Instagram replies today." : "Log in to see what your automations did today."}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {signup && (<div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" className="h-11" /></div>)}
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" className="h-11" /></div>
            <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required minLength={signup ? 8 : 1} autoComplete={signup ? "new-password" : "current-password"} className="h-11" />{signup && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}</div>
            {err && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
            <Button size="lg" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{signup ? "Create account" : "Log in"}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {signup ? <>Already have an account? <Link className="font-medium text-primary hover:underline" href="/login">Log in</Link></> : <>New here? <Link className="font-medium text-primary hover:underline" href="/signup">Create an account</Link></>}
          </p>
          {signup && <p className="mt-4 text-center text-xs text-muted-foreground">By signing up you agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>}
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-ink p-12 text-background lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/90 blur-[2px]" aria-hidden />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full border border-background/15" aria-hidden />
        <p className="relative font-display text-5xl leading-[1.05]">Every comment,<br />answered like you<br />were there.</p>
        <ul className="relative space-y-3 text-sm text-background/80">
          {POINTS.map((p) => (<li key={p} className="flex items-center gap-3"><span className="grid h-5 w-5 place-items-center rounded-full bg-background/15"><Check className="h-3 w-3" /></span>{p}</li>))}
        </ul>
      </aside>
    </main>
  );
}
