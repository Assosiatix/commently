import { Download, Users } from "lucide-react";
import Link from "next/link";
import LeadActions from "@/components/LeadActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cn, fmt, timeAgo } from "@/lib/utils";

export const metadata = { title: "Leads" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "attention", label: "Needs attention" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "customer", label: "Customers" },
] as const;

export default async function Leads({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const user = await requireUser();
  const { f } = await searchParams;
  const active = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const own = { account: { userId: user.id } };
  const where = active.key === "all" ? own : active.key === "attention" ? { ...own, needsAttention: true } : { ...own, status: active.key };

  const [rows, total, attention, customers] = await Promise.all([
    db.lead.findMany({ where, include: { account: { select: { username: true } } }, orderBy: [{ needsAttention: "desc" }, { lastSeenAt: "desc" }], take: 200 }),
    db.lead.count({ where: own }),
    db.lead.count({ where: { ...own, needsAttention: true } }),
    db.lead.count({ where: { ...own, status: "customer" } }),
  ]);

  return (
    <>
      <PageHeader title="Leads" description="Everyone who commented on your posts and got a DM, what they asked about, and who needs a human reply.">
        {total > 0 && <Button asChild variant="outline"><a href="/api/leads/export"><Download /> Export CSV</a></Button>}
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        {[["Leads", fmt(total)], ["Need attention", fmt(attention)], ["Customers", fmt(customers)]].map(([l, v]) => (
          <Card key={l} className="p-5"><p className="text-sm font-medium text-graphite">{l}</p><p className={cn("mt-2 font-display text-3xl font-bold tabular-nums", l === "Need attention" && attention > 0 && "text-warning")}>{v}</p></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((x) => (
          <Link key={x.key} href={x.key === "all" ? "/dashboard/leads" : `/dashboard/leads?f=${x.key}`} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition-colors", x.key === active.key ? "bg-foreground text-background" : "border bg-card text-graphite hover:border-foreground/30 hover:text-foreground")}>{x.label}</Link>
        ))}
      </div>

      {rows.length ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Person</TableHead><TableHead>Asked about</TableHead><TableHead className="hidden lg:table-cell">Last comment</TableHead><TableHead>Last seen</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id} className="align-top">
                  <TableCell>
                    {l.username ? <a href={`https://instagram.com/${l.username}`} target="_blank" rel="noreferrer" className="font-semibold hover:text-coral">@{l.username}</a> : <span className="font-medium">{l.igsid}</span>}
                    <p className="text-xs text-muted-foreground">via @{l.account.username}{l.commentCount > 1 ? ` · ${l.commentCount} comments` : ""}</p>
                    {l.needsAttention && <Badge variant="warning" className="mt-1">Needs a reply</Badge>}
                  </TableCell>
                  <TableCell className="max-w-[14rem]">
                    <div className="flex flex-wrap gap-1">{l.products.slice(0, 3).map((p) => <Badge key={p} variant="secondary" className="max-w-[12rem] truncate">{p}</Badge>)}{l.products.length > 3 && <span className="text-xs text-muted-foreground">+{l.products.length - 3}</span>}</div>
                    {l.lastIntent && <p className="mt-1 text-xs text-muted-foreground">{l.lastIntent.replace("_", " ")}</p>}
                  </TableCell>
                  <TableCell className="hidden max-w-[16rem] truncate text-muted-foreground lg:table-cell">{l.lastComment}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{timeAgo(l.lastSeenAt)}</TableCell>
                  <TableCell><LeadActions id={l.id} status={l.status} needsAttention={l.needsAttention} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState icon={Users} title={total ? "Nothing in this view" : "No leads yet"} text={total ? "Try another filter." : "When someone comments on a post with an automation and gets a DM, they are saved here automatically."} />
      )}
    </>
  );
}
