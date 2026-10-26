import { AlertTriangle, Check, ShieldCheck, ShoppingBag } from "lucide-react";
import CopyField from "@/components/CopyField";
import ShopifyConnectForm from "@/components/shopify/ShopifyConnectForm";
import StoreActions from "@/components/shopify/StoreActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { redirectUri, SHOPIFY_SCOPES, shopifyConfigured } from "@/lib/shopify";
import { fmt, timeAgo } from "@/lib/utils";

export const metadata = { title: "Shopify" };

export default async function ShopifyPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string; shop?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const configured = shopifyConfigured();
  const stores = await db.shopifyStore.findMany({ where: { userId: user.id }, orderBy: { installedAt: "desc" }, include: { _count: { select: { products: true } } } });
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

  return (
    <>
      <PageHeader title="Shopify" description="Connect your store so replies can use your real prices, sizes and stock." />

      {sp.connected && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"><Check className="h-4 w-4 shrink-0" /> Store connected. We are fetching your products now, this takes a moment.</div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {sp.error}</div>
      )}

      {!configured && (
        <Card>
          <CardHeader><CardTitle>Shopify app is not configured on this server</CardTitle><CardDescription>One-time setup in the Shopify Partner dashboard, then add these to your environment.</CardDescription></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
              <li>Partner dashboard, Apps, Create app. Distribution: <b className="text-foreground">Public</b> (or custom distribution while testing).</li>
              <li>Set the URLs below, scopes <code className="rounded bg-muted px-1">{SHOPIFY_SCOPES()}</code>, and the compliance webhook URLs to the webhook URL.</li>
              <li>Put <code className="rounded bg-muted px-1">SHOPIFY_API_KEY</code> and <code className="rounded bg-muted px-1">SHOPIFY_API_SECRET</code> in <code className="rounded bg-muted px-1">.env</code>, then restart.</li>
            </ol>
            <CopyField label="App URL" value={`${appUrl}/dashboard/shopify`} />
            <CopyField label="Allowed redirection URL" value={appUrl ? redirectUri() : ""} />
            <CopyField label="Webhook URL (also for the 3 compliance webhooks)" value={`${appUrl}/api/shopify/webhooks`} />
          </CardContent>
        </Card>
      )}

      {configured && !stores.some((s) => s.status === "connected" && !!s.refreshTokenEnc) && !stores.length && (
        <Card>
          <CardHeader>
            <div className="mb-1 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary"><ShoppingBag className="h-5 w-5" /></div>
            <CardTitle className="text-lg">Connect your Shopify store</CardTitle>
            <CardDescription>We send you to Shopify to approve the app, then bring you straight back here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ShopifyConnectForm defaultShop={sp.shop ?? ""} />
            <ul className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <li className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Read-only access to <b className="text-foreground">products and stock</b>. We never touch orders or customers, and cannot change your store.</li>
              <li className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Prices and stock stay in sync automatically when you edit products in Shopify.</li>
              <li className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Remove it any time from here or from Shopify admin.</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {stores.map((s) => {
        const connected = s.status === "connected" && !!s.refreshTokenEnc; // tokens without a refresh token are the old non-expiring kind, which Shopify now rejects
        const legacyToken = s.status === "connected" && !s.refreshTokenEnc;
        const syncing = s.syncStatus === "syncing" || s.syncStatus === "partial";
        return (
          <Card key={s.id} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#95bf47]/15 text-[#5e8e3e]"><ShoppingBag className="h-6 w-6" /></div>
                <div>
                  <p className="text-lg font-semibold leading-tight">{s.shopName ?? s.shopDomain}</p>
                  <a href={`https://${s.shopDomain}`} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-primary hover:underline">{s.shopDomain}</a>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={connected ? "success" : "destructive"}>{connected ? "Connected" : legacyToken ? "Reconnect needed" : "Disconnected"}</Badge>
                {connected && <Badge variant={s.webhooksOk ? "success" : "warning"}>Live updates {s.webhooksOk ? "on" : "pending"}</Badge>}
                {s.syncStatus === "error" && <Badge variant="destructive">Sync failed</Badge>}
              </div>
            </div>

            {connected ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
                  <div><p className="font-display text-3xl tabular-nums leading-none">{fmt(s._count.products)}</p><p className="mt-1 text-xs text-muted-foreground">Products synced</p></div>
                  <div><p className="font-display text-3xl leading-none">{s.currency ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">Store currency</p></div>
                  <div><p className="text-sm font-medium">{syncing ? "Syncing…" : s.lastSyncAt ? timeAgo(s.lastSyncAt) : "Not yet"}</p><p className="mt-1 text-xs text-muted-foreground">Last sync</p></div>
                  <div><p className="text-sm font-medium">{s.scopes.split(",").filter(Boolean).length} permissions</p><p className="mt-1 text-xs text-muted-foreground">{s.scopes || "—"}</p></div>
                </div>
                {s.syncError && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{s.syncError}</p>}
                <div className="mt-5"><StoreActions id={s.id} name={s.shopName ?? s.shopDomain} syncing={syncing} /></div>
              </>
            ) : (
              <div className="mt-5 space-y-3 border-t pt-5">
                <p className="text-sm text-muted-foreground">{legacyToken ? "Shopify now requires a newer kind of access token. Reconnect once to fix it. You do not lose any reel or product links." : s.syncError || "The app was removed from this store or its access expired. Install it again to resume syncing."}</p>
                <ShopifyConnectForm defaultShop={s.shopDomain} label="Reconnect" />
              </div>
            )}
          </Card>
        );
      })}
    </>
  );
}
