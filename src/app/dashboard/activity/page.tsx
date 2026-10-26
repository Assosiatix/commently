import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Activity log" };
const tone = { SENT: "success", PARTIAL: "warning", SKIPPED: "secondary", FAILED: "destructive", PENDING: "secondary" } as const;

export default async function ActivityLog() {
  const user = await requireUser();
  const logs = await db.eventLog.findMany({ where: { account: { userId: user.id } }, include: { automation: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 150 });
  return (
    <>
      <PageHeader title="Activity log" description="Every matching comment, what we did about it, and why when something was skipped or failed. Latest 150." />
      {logs.length ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>When</TableHead><TableHead>From</TableHead><TableHead>Comment</TableHead><TableHead className="hidden md:table-cell">Automation</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} className="align-top">
                  <TableCell className="whitespace-nowrap text-muted-foreground" title={l.createdAt.toISOString()}>{timeAgo(l.createdAt)}</TableCell>
                  <TableCell className="font-medium">@{l.fromUsername ?? l.fromIgId}</TableCell>
                  <TableCell className="max-w-[16rem] truncate text-muted-foreground">{l.commentText}</TableCell>
                  <TableCell className="hidden md:table-cell">{l.automation.name}</TableCell>
                  <TableCell><Badge variant={tone[l.status]}>{l.status.toLowerCase()}</Badge>{l.error && <p className="mt-1 max-w-[18rem] text-xs text-muted-foreground">{l.error}</p>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState icon={Activity} title="Nothing yet" text="Matching comments will appear here as soon as they arrive." />
      )}
    </>
  );
}
