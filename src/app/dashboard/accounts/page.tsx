import { Camera } from "lucide-react";
import ConnectInstagram from "@/components/ConnectInstagram";
import DisconnectButton from "@/components/AccountActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Instagram accounts" };

export default async function Accounts() {
  const user = await requireUser();
  const [accounts, counts] = await Promise.all([
    db.igAccount.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.automation.groupBy({ by: ["accountId"], where: { userId: user.id }, _count: { _all: true } }),
  ]);
  const plan = PLANS[user.plan];
  const autoCount = new Map(counts.map((c) => [c.accountId, c._count._all]));
  const full = accounts.length >= plan.accounts;
  return (
    <>
      <PageHeader title="Instagram accounts" description={`${accounts.length} of ${plan.accounts} connected on the ${plan.name} plan. Business or Creator accounts only.`}>
        {!full || accounts.length ? <ConnectInstagram label={accounts.length ? "Add or reconnect" : "Connect Instagram"} /> : null}
      </PageHeader>
      <div className="space-y-4">
        {accounts.map((a) => {
          const days = Math.ceil((a.tokenExpiresAt.getTime() - Date.now()) / 864e5);
          const bad = a.status !== "active" || days <= 0;
          return (
            <Card key={a.id} className="flex flex-wrap items-center gap-4 p-5">
              <Avatar className="h-12 w-12"><AvatarImage src={a.profilePictureUrl ?? undefined} alt="" /><AvatarFallback>{a.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">@{a.username}</p>
                <p className="text-sm text-muted-foreground">{a.accountType?.replace("_", " ").toLowerCase() ?? "professional"} · {autoCount.get(a.id) ?? 0} automations</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={a.webhookSubscribed ? "success" : "warning"}>Webhook {a.webhookSubscribed ? "on" : "off"}</Badge>
                <Badge variant={bad ? "destructive" : "success"}>{bad ? "Reconnect needed" : `Token ${days}d, auto-renews`}</Badge>
              </div>
              <DisconnectButton id={a.id} username={a.username} />
            </Card>
          );
        })}
        {!accounts.length && (
          <EmptyState icon={Camera} title="No account connected" text="Connect with Instagram's official login. We never see your password, and you can disconnect at any time.">
            <ConnectInstagram />
          </EmptyState>
        )}
      </div>
    </>
  );
}
