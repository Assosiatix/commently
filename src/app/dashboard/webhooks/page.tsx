import { Webhook } from "lucide-react";
import CopyField from "@/components/CopyField";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Webhooks" };
const tone = { PROCESSED: "success", RECEIVED: "secondary", FAILED: "destructive" } as const;

export default async function Webhooks() {
  const user = await requireUser();
  const accounts = await db.igAccount.findMany({ where: { userId: user.id }, select: { igUserId: true, username: true, webhookSubscribed: true } });
  const ids = accounts.map((a) => a.igUserId);
  const events = ids.length ? await db.webhookEvent.findMany({ where: { entryIds: { hasSome: ids } }, orderBy: { receivedAt: "desc" }, take: 50 }) : [];
  const callback = `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/api/webhooks/instagram`;
  const tokenSet = !!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  const failed = events.filter((e) => e.status === "FAILED").length;

  return (
    <>
      <PageHeader title="Webhooks" description="Instagram tells us about new comments and replies through a webhook. This page shows it is healthy." />
      <Card>
        <CardHeader><CardTitle>Meta app configuration</CardTitle><CardDescription>Paste into Meta App Dashboard → Instagram → Webhooks. Subscribe to <b>comments</b> and <b>messages</b>.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="Callback URL" value={callback} />
          <p className="text-sm text-muted-foreground">Verify token: {tokenSet ? <Badge variant="success">configured on the server</Badge> : <Badge variant="destructive">INSTAGRAM_WEBHOOK_VERIFY_TOKEN missing</Badge>}</p>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => <Badge key={a.igUserId} variant={a.webhookSubscribed ? "success" : "warning"}>@{a.username}: {a.webhookSubscribed ? "subscribed" : "not subscribed, reconnect"}</Badge>)}
            {!accounts.length && <span className="text-sm text-muted-foreground">Connect an Instagram account first.</span>}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold">Recent deliveries {failed > 0 && <Badge variant="destructive">{failed} failed, retrying</Badge>}</h2>
        {events.length ? (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Received</TableHead><TableHead>Type</TableHead><TableHead>Attempts</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{timeAgo(e.receivedAt)}</TableCell>
                    <TableCell>{e.fields.join(", ") || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{e.attempts}</TableCell>
                    <TableCell><Badge variant={tone[e.status]}>{e.status.toLowerCase()}</Badge>{e.error && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{e.error}</p>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <EmptyState icon={Webhook} title="No deliveries yet" text="Comment on one of your posts from a different account. The event should appear here within seconds." />
        )}
      </div>
    </>
  );
}
