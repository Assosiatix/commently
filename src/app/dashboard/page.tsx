import { AlertTriangle, ArrowRight, Check, MessageCircleReply, Send, Reply, Zap } from "lucide-react";
import Link from "next/link";
import ConnectInstagram from "@/components/ConnectInstagram";
import { BarChart, Delta, Legend, StatCard } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAutomationStats, getOverviewStats } from "@/lib/stats";
import { fmt, pct, timeAgo } from "@/lib/utils";

export const metadata = { title: "Overview" };

const statusTone = { SENT: "success", PARTIAL: "warning", SKIPPED: "secondary", FAILED: "destructive", PENDING: "secondary" } as const;

export default async function Overview() {
  const user = await requireUser();
  const [s, accounts, autos, recent, perAuto, firstEvent] = await Promise.all([
    getOverviewStats(user.id, 14),
    db.igAccount.findMany({ where: { userId: user.id }, select: { id: true, username: true, status: true, webhookSubscribed: true } }),
    db.automation.findMany({ where: { userId: user.id }, select: { id: true, name: true, enabled: true } }),
    db.eventLog.findMany({ where: { account: { userId: user.id } }, include: { automation: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    getAutomationStats(user.id),
    db.eventLog.findFirst({ where: { account: { userId: user.id }, status: { in: ["SENT", "PARTIAL"] } }, select: { id: true } }),
  ]);

  const replyRate = pct(s.replied, s.dms);
  const needsAttention = accounts.filter((a) => a.status !== "active" || !a.webhookSubscribed);
  const top = autos.map((a) => ({ ...a, ...(perAuto.get(a.id) ?? { triggers: 0, dms: 0, replied: 0, followUps: 0, failed: 0 }) })).sort((a, b) => b.dms - a.dms).slice(0, 4);

  const steps = [
    { done: accounts.length > 0, title: "Connect Instagram", text: "Link a Business or Creator account.", href: "/dashboard/accounts" },
    { done: autos.length > 0, title: "Create an automation", text: "Pick a post and a keyword.", href: "/dashboard/automations/new" },
    { done: !!firstEvent, title: "Send your first DM", text: "Comment on your post from another account.", href: "/dashboard/conversations" },
  ];
  const stepsDone = steps.filter((x) => x.done).length;

  return (
    <>
      <PageHeader title={`${user.name ? `Hi ${user.name.split(" ")[0]}` : "Welcome back"}.`} description="Here is what your automations did over the last 14 days.">
        <Button asChild><Link href="/dashboard/automations/new"><Zap /> New automation</Link></Button>
      </PageHeader>

      {needsAttention.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-coral-soft px-4 py-3 text-sm font-medium text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{needsAttention.map((a) => `@${a.username}`).join(", ")} {needsAttention.length > 1 ? "need" : "needs"} attention: token expired or webhook not subscribed.</span>
          <Button asChild size="sm" variant="outline"><Link href="/dashboard/accounts">Fix now</Link></Button>
        </div>
      )}

      {stepsDone < steps.length && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between"><CardTitle>Finish setting up</CardTitle><span className="text-xs text-muted-foreground">{stepsDone} of {steps.length} done</span></div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {steps.map((st, i) => (
              <Link key={st.title} href={st.href} className="group flex items-start gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-coral-soft">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${st.done ? "bg-success text-white dark:text-background" : "border border-input text-muted-foreground"}`}>
                  {st.done ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{i + 1}</span>}
                </span>
                <div><p className={`text-sm font-medium ${st.done ? "text-muted-foreground line-through" : ""}`}>{st.title}</p><p className="text-xs text-muted-foreground">{st.text}</p></div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="First DMs sent" value={fmt(s.dms)} icon={Send} foot={<Delta now={s.dms} prev={s.prevDms} />} />
        <StatCard label="People who replied" value={fmt(s.replied)} icon={MessageCircleReply} foot={<Delta now={s.replied} prev={s.prevReplied} />} />
        <StatCard label="Follow-ups sent" value={fmt(s.followUps)} icon={Reply} foot={<span className="text-xs text-muted-foreground">{replyRate}% reply rate · {fmt(s.awaiting)} waiting</span>} />
        <StatCard label="Failed" value={fmt(s.failed)} icon={AlertTriangle} tone={s.failed ? "bad" : "default"} foot={<span className="text-xs text-muted-foreground">{fmt(s.skipped)} skipped on purpose</span>} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>Messages sent</CardTitle><CardDescription>Per day, last 14 days (UTC)</CardDescription></div><Legend /></div>
          </CardHeader>
          <CardContent><BarChart data={s.series} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top automations</CardTitle><CardDescription>By DMs sent, all time</CardDescription></CardHeader>
          <CardContent className="space-y-1">
            {top.map((a) => (
              <Link key={a.id} href={`/dashboard/automations/${a.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.replied} replies · {a.followUps} follow-ups</p></div>
                <span className="font-display text-2xl font-bold tabular-nums">{fmt(a.dms)}</span>
              </Link>
            ))}
            {!top.length && <p className="py-6 text-center text-sm text-muted-foreground">No automations yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between"><CardTitle>Recent activity</CardTitle><Button asChild variant="ghost" size="sm"><Link href="/dashboard/activity">View all <ArrowRight /></Link></Button></div>
        </CardHeader>
        <CardContent className="divide-y">
          {recent.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral-tint text-xs font-semibold">{(l.fromUsername ?? "?").slice(0, 1).toUpperCase()}</span>
              <p className="min-w-0 flex-1 text-sm"><span className="font-medium">@{l.fromUsername ?? l.fromIgId}</span> <span className="text-muted-foreground">commented</span> <span className="truncate">“{l.commentText}”</span></p>
              <span className="hidden text-xs text-muted-foreground sm:inline">{l.automation.name}</span>
              <Badge variant={statusTone[l.status]}>{l.status.toLowerCase()}</Badge>
              <span className="w-16 text-right text-xs text-muted-foreground">{timeAgo(l.createdAt)}</span>
            </div>
          ))}
          {!recent.length && (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">{accounts.length ? "No comments handled yet. Comment on your post from another account to test." : "Connect an Instagram account to start."}</p>
              {!accounts.length && <div className="flex justify-center"><ConnectInstagram /></div>}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
