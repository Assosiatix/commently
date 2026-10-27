import { redirect } from "next/navigation";
import PlanCards from "@/components/PlanCards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { getUsage, monthStart, PLANS, PRICING_ENABLED, unlimited } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { fmt } from "@/lib/utils";

export const metadata = { title: "Plan & usage" };

export default async function Billing() {
  if (!PRICING_ENABLED) redirect("/dashboard");
  const user = await requireUser();
  const u = await getUsage(user.id, user.plan);
  const resets = new Date(Date.UTC(monthStart().getUTCFullYear(), monthStart().getUTCMonth() + 1, 1)).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const meters = [
    { label: "DMs this month", used: u.dms, limit: u.limits.dms, note: `Resets ${resets}` },
    { label: "AI answers this month", used: u.aiReplies, limit: u.limits.aiReplies, note: `Resets ${resets}` },
    { label: "Instagram accounts", used: u.accounts, limit: u.limits.accounts },
    { label: "Automations", used: u.automations, limit: u.limits.automations },
  ];
  return (
    <>
      <PageHeader title="Plan & usage" description={`You are on the ${u.limits.name} plan.`} />
      <Card>
        <CardHeader><CardTitle>Usage</CardTitle><CardDescription>First DMs and follow-ups both count towards the monthly DM allowance.</CardDescription></CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {meters.map((m) => {
            const inf = unlimited(m.limit);
            const ratio = inf ? 0 : Math.round((m.used / m.limit) * 100);
            return (
              <div key={m.label}>
                <p className="text-sm font-medium text-graphite">{m.label}</p>
                <p className="mt-2 font-display text-4xl font-bold tabular-nums leading-none">{fmt(m.used)}<span className="text-lg text-muted-foreground"> / {inf ? "unlimited" : fmt(m.limit)}</span></p>
                <Progress value={ratio} className="mt-3 h-1.5" indicatorClassName={ratio >= 90 ? "bg-destructive" : undefined} />
                {m.note && <p className="mt-2 text-xs text-muted-foreground">{m.note}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>
      <div className="pt-2">
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">Change plan</h2>
        <PlanCards mode={{ kind: "billing", current: user.plan, devSwitch: process.env.NODE_ENV !== "production" }} />
        {process.env.NODE_ENV !== "production" && <p className="mt-4 text-xs text-muted-foreground">Development build: plan buttons switch instantly so you can test limits. In production they will open checkout once a payment provider is connected.</p>}
      </div>
    </>
  );
}
