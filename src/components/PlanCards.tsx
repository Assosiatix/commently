"use client";
import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_ORDER, PLANS } from "@/lib/plan-data";
import { cn } from "@/lib/utils";

type Mode = { kind: "landing" } | { kind: "billing"; current: string; devSwitch: boolean };

export default function PlanCards({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function switchTo(plan: string) {
    setBusy(plan);
    const r = await fetch("/api/billing/dev-switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    setBusy(null);
    if (!r.ok) return toast.error("Could not change plan");
    toast.success("Plan changed (development switch)");
    router.refresh();
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_ORDER.map((id) => {
        const p = PLANS[id];
        const featured = id === "PRO";
        const current = mode.kind === "billing" && mode.current === id;
        return (
          <div key={id} className={cn("relative flex flex-col rounded-2xl border p-6 transition-shadow", featured ? "border-ink bg-ink text-background shadow-xl" : "bg-card hover:shadow-md")}>
            {featured && <Badge className="absolute -top-3 left-6 border-transparent bg-primary text-primary-foreground">Most popular</Badge>}
            <h3 className="font-display text-3xl">{p.name}</h3>
            <p className={cn("mt-1 text-sm", featured ? "text-background/70" : "text-muted-foreground")}>{p.blurb}</p>
            <p className="mt-5 flex items-baseline gap-1"><span className="font-display text-6xl leading-none tabular-nums">${p.price}</span><span className={cn("text-sm", featured ? "text-background/60" : "text-muted-foreground")}>/ month</span></p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-primary" : "text-success")} />{f}</li>
              ))}
            </ul>
            <div className="mt-7">
              {mode.kind === "landing" ? (
                <Button asChild size="lg" variant={featured ? "default" : "outline"} className="w-full"><Link href="/signup">{p.price ? `Start with ${p.name}` : "Start free"}</Link></Button>
              ) : current ? (
                <Button size="lg" variant="secondary" className="w-full" disabled>Current plan</Button>
              ) : mode.devSwitch ? (
                <Button size="lg" variant={featured ? "default" : "outline"} className="w-full" disabled={!!busy} onClick={() => switchTo(id)}>{busy === id ? "Switching…" : `Switch to ${p.name}`}</Button>
              ) : (
                <Button size="lg" variant={featured ? "default" : "outline"} className="w-full" disabled>Checkout coming soon</Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
