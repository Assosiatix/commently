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
          <div key={id} className={cn("relative flex flex-col rounded-3xl p-6 transition-shadow duration-200 md:p-7", featured ? "bg-coral-soft ring-2 ring-coral shadow-card-hover" : "border bg-card shadow-card hover:shadow-card-hover")}>
            {featured && <Badge className="absolute -top-3 left-6 bg-coral text-white">Most popular</Badge>}
            <h3 className="font-display text-2xl font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-graphite">{p.blurb}</p>
            <p className="mt-5 flex items-baseline gap-1"><span className="font-display text-5xl font-bold leading-none tabular-nums">${p.price}</span><span className="text-sm text-graphite">/ month</span></p>
            <ul className="mt-6 flex-1 space-y-3 text-[15px]">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background"><Check className="h-3 w-3" strokeWidth={3} /></span>{f}</li>
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
