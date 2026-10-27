import { Camera } from "lucide-react";
import ConnectInstagram from "@/components/ConnectInstagram";
import DisconnectButton from "@/components/AccountActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { db } from "@/lib/db";
import CopyField from "@/components/CopyField";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin } from "@/lib/admin";
import { redirectUri } from "@/lib/instagram";
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
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const productionLike = process.env.NODE_ENV === "production";
  const admin = isAdmin(user.email);
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
                <Badge variant={!bad && a.webhookSubscribed ? "success" : "warning"}>{!bad && a.webhookSubscribed ? "Connected" : "Needs reconnecting"}</Badge>
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

      {admin && (
      <Card>
        <CardHeader>
          <CardTitle>Admin: Meta app settings for this site</CardTitle>
          <CardDescription>If Instagram says “Invalid redirect_uri”, the first value below must be saved in Meta exactly as shown (Instagram, API setup with Instagram login, Business login settings).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {appUrl && productionLike && /ngrok|localhost|127\.0\.0\.1/.test(appUrl) && (
            <p role="alert" className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">APP_URL on this server is still <b>{appUrl}</b>. Set it to this site&apos;s real address in your hosting environment variables and redeploy, otherwise Instagram receives the wrong redirect URL.</p>
          )}
          <CopyField label="OAuth redirect URI" value={appUrl ? redirectUri() : "APP_URL is not set"} />
          <CopyField label="Deauthorize callback URL" value={`${appUrl}/api/instagram/deauthorize`} />
          <CopyField label="Data deletion request URL" value={`${appUrl}/api/instagram/data-deletion`} />
          <CopyField label="Webhook callback URL" value={`${appUrl}/api/webhooks/instagram`} />
        </CardContent>
      </Card>
      )}
    </>
  );
}
