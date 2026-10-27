import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cn, fmt, pct, timeAgo } from "@/lib/utils";
import type { ConversationStatus } from "@/generated/prisma/client";

export const metadata = { title: "Conversations" };

const FILTERS: { key: string; label: string; where?: { status: ConversationStatus | { not: ConversationStatus } } }[] = [
  { key: "all", label: "All" },
  { key: "waiting", label: "Waiting for reply", where: { status: "OPENER_SENT" } },
  { key: "replied", label: "Replied", where: { status: { not: "OPENER_SENT" } } },
  { key: "gate", label: "Asked to follow", where: { status: "FOLLOW_REQUIRED" } },
  { key: "followup", label: "Follow-up sent", where: { status: "FOLLOWUP_SENT" } },
  { key: "failed", label: "Follow-up failed", where: { status: "FOLLOWUP_FAILED" } },
];
const tone = { OPENER_SENT: ["secondary", "Waiting for reply"], FOLLOW_REQUIRED: ["warning", "Asked to follow"], REPLIED: ["default", "Replied"], FOLLOWUP_SENT: ["success", "Follow-up sent"], FOLLOWUP_FAILED: ["destructive", "Follow-up failed"] } as const;

export default async function Conversations({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const user = await requireUser();
  const { f } = await searchParams;
  const active = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const own = { account: { userId: user.id } };

  const [rows, total, replied, followUps, waiting] = await Promise.all([
    db.conversation.findMany({ where: { ...own, ...active.where }, include: { automation: { select: { name: true } }, account: { select: { username: true } } }, orderBy: { openerAt: "desc" }, take: 100 }),
    db.conversation.count({ where: own }),
    db.conversation.count({ where: { ...own, status: { not: "OPENER_SENT" } } }),
    db.conversation.count({ where: { ...own, status: "FOLLOWUP_SENT" } }),
    db.conversation.count({ where: { ...own, status: "OPENER_SENT" } }),
  ]);

  return (
    <>
      <PageHeader title="Conversations" description="Every person who got your first DM, whether they replied, and whether the follow-up went out." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["First DMs", fmt(total)], ["Replied", `${fmt(replied)} · ${pct(replied, total)}%`], ["Follow-ups sent", fmt(followUps)], ["Waiting", fmt(waiting)]].map(([l, v]) => (
          <Card key={l} className="p-5"><p className="text-sm font-medium text-graphite">{l}</p><p className="mt-2 font-display text-3xl font-bold tabular-nums">{v}</p></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((x) => (
          <Link key={x.key} href={x.key === "all" ? "/dashboard/conversations" : `/dashboard/conversations?f=${x.key}`} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition-colors", x.key === active.key ? "bg-foreground text-background" : "border bg-card text-graphite hover:border-foreground/30 hover:text-foreground")}>{x.label}</Link>
        ))}
      </div>

      {rows.length ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Person</TableHead><TableHead>Their comment</TableHead><TableHead className="hidden md:table-cell">Automation</TableHead><TableHead>Status</TableHead><TableHead className="text-right">First DM</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((c) => {
                const [variant, label] = tone[c.status];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">@{c.username ?? c.igsid}<p className="text-xs font-normal text-muted-foreground">via @{c.account.username}</p></TableCell>
                    <TableCell className="max-w-[16rem] truncate text-muted-foreground">{c.commentText}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.automation.name}</TableCell>
                    <TableCell><Badge variant={variant}>{label}</Badge>{c.error && <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">{c.error}</p>}{c.repliedAt && <p className="mt-1 text-xs text-muted-foreground">replied {timeAgo(c.repliedAt)}</p>}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">{timeAgo(c.openerAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState icon={MessagesSquare} title={total ? "Nothing in this view" : "No conversations yet"} text={total ? "Try another filter." : "When someone comments a keyword and gets your DM, the conversation shows up here."} />
      )}
    </>
  );
}
