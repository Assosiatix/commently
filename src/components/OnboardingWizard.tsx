"use client";
import { ArrowRight, BadgeDollarSign, Check, Headset, Loader2, Megaphone, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import AutomationForm from "@/components/AutomationForm";
import ConnectInstagram from "@/components/ConnectInstagram";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const GOALS = [
  { id: "sales", label: "Sell products", text: "Send links and prices to buyers", icon: BadgeDollarSign },
  { id: "leads", label: "Collect leads", text: "Hand out guides in exchange for a reply", icon: Megaphone },
  { id: "followers", label: "Grow my audience", text: "Start conversations with every commenter", icon: Users },
  { id: "support", label: "Answer questions", text: "Reply to common questions instantly", icon: Headset },
] as const;

const STEPS = ["About you", "Connect Instagram", "First automation", "Go live"];

type Props = { appName: string; initialStep: number; name: string; goal: string | null; accounts: { id: string; username: string; webhookSubscribed: boolean; profilePictureUrl: string | null }[]; canFollowUp: boolean };

export default function OnboardingWizard({ appName, initialStep, name: initialName, goal: initialGoal, accounts, canFollowUp }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState(initialName);
  const [goal, setGoal] = useState<string | null>(initialGoal);
  const [busy, setBusy] = useState(false);

  async function patch(body: object) {
    const r = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error("save failed");
  }
  async function saveProfile() {
    if (!goal) return toast.error("Pick what you want to use it for");
    setBusy(true);
    try { await patch({ name, goal }); setStep(1); } catch { toast.error("Could not save, try again"); }
    setBusy(false);
  }
  async function finish() {
    setBusy(true);
    try { await patch({ onboarded: true }); router.push("/dashboard"); router.refresh(); } catch { toast.error("Could not finish setup"); setBusy(false); }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo name={appName} href="/" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={finish} disabled={busy}>Skip setup</Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <ol className="mb-10 flex items-center gap-2 sm:gap-4" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2 sm:gap-3">
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors", i < step ? "bg-success text-white dark:text-background" : i === step ? "bg-ink text-background" : "border text-muted-foreground")}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
              <span className={cn("hidden text-sm sm:block", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-success" : "bg-border")} />}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="mx-auto max-w-2xl animate-fade-up space-y-8">
            <div><h1 className="font-display text-4xl sm:text-5xl">Let’s set you up.</h1><p className="mt-2 text-muted-foreground">Two quick questions so we can suggest the right starting automation.</p></div>
            <div className="space-y-1.5"><Label htmlFor="nm">What should we call you?</Label><Input id="nm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" maxLength={80} className="h-11" /></div>
            <div className="space-y-2">
              <Label>What will you use {appName} for?</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {GOALS.map(({ id, label, text, icon: Icon }) => (
                  <button type="button" key={id} onClick={() => setGoal(id)} className={cn("flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5", goal === id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40")}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>
                    <span><span className="block text-sm font-medium">{label}</span><span className="text-xs text-muted-foreground">{text}</span></span>
                  </button>
                ))}
              </div>
            </div>
            <Button size="lg" onClick={saveProfile} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Continue <ArrowRight /></Button>
          </div>
        )}

        {step === 1 && (
          <div className="mx-auto max-w-2xl animate-fade-up space-y-6">
            <div><h1 className="font-display text-4xl sm:text-5xl">Connect your Instagram.</h1><p className="mt-2 text-muted-foreground">You sign in on Instagram’s own page. We never see your password, and you can disconnect whenever you like.</p></div>
            <Card className="space-y-5 p-6">
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {["Works with Business and Creator accounts (switch for free in Instagram settings).", "We only ask for permission to read comments and send messages.", "Tokens are encrypted and renewed automatically."].map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>
                ))}
              </ul>
              {accounts.length ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-success-soft p-4 text-sm text-success">
                  <span className="flex items-center gap-2 font-medium"><Check className="h-4 w-4" /> Connected {accounts.map((a) => `@${a.username}`).join(", ")}</span>
                  <Button onClick={() => setStep(2)}>Continue <ArrowRight /></Button>
                </div>
              ) : (
                <ConnectInstagram size="lg" />
              )}
            </Card>
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up space-y-6">
            <div><h1 className="font-display text-4xl sm:text-5xl">Build your first automation.</h1><p className="mt-2 max-w-xl text-muted-foreground">Start from a template or write your own. You can change everything later.</p></div>
            <AutomationForm accounts={accounts} canFollowUp={canFollowUp} showProducts={goal === "sales"} onSaved={() => setStep(3)} />
            <Button variant="ghost" onClick={() => setStep(3)}>I’ll do this later</Button>
          </div>
        )}

        {step === 3 && (
          <div className="mx-auto max-w-2xl animate-fade-up space-y-6">
            <div><h1 className="font-display text-4xl sm:text-5xl">You’re ready to go live.</h1><p className="mt-2 text-muted-foreground">One last check, then test it from a second Instagram account.</p></div>
            <Card className="divide-y">
              {[
                [accounts.length > 0, "Instagram connected", accounts.length ? accounts.map((a) => `@${a.username}`).join(", ") : "Connect an account from the dashboard."],
                [accounts.length > 0 && accounts.every((a) => a.webhookSubscribed), "Ready for comments", "Your automations will react to new comments and replies."],
              ].map(([ok, t, d]) => (
                <div key={t as string} className="flex items-start gap-3 p-4">
                  <span className={cn("mt-0.5 grid h-5 w-5 place-items-center rounded-full", ok ? "bg-success text-white dark:text-background" : "border text-muted-foreground")}>{ok ? <Check className="h-3 w-3" /> : null}</span>
                  <div><p className="text-sm font-medium">{t as string}</p><p className="text-xs text-muted-foreground">{d as string}</p></div>
                </div>
              ))}
              <div className="p-4 text-sm"><p className="font-medium">Try it now</p><p className="mt-1 text-muted-foreground">From another Instagram account, comment your keyword on the post you picked. The DM arrives within seconds, and you’ll see it in Conversations.</p></div>
            </Card>
            <div className="flex gap-3"><Button size="lg" onClick={finish} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Open my dashboard <ArrowRight /></Button><Button size="lg" variant="outline" onClick={() => setStep(2)}>Back</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}
