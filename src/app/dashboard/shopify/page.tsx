import { AlertTriangle, Check, ShieldCheck, ShoppingBag } from "lucide-react";
import { redirect } from "next/navigation";
import CopyField from "@/components/CopyField";
import ShopifyConnectForm from "@/components/shopify/ShopifyConnectForm";
import StoreActions from "@/components/shopify/StoreActions";
import StoreNotes from "@/components/shopify/StoreNotes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { normalizeShop, redirectUri, SHOPIFY_SCOPES, shopifyConfigured, verifyQueryHmac } from "@/lib/shopify";
import { fmt, timeAgo } from "@/lib/utils";

export const metadata = { title: "Shopify" };

type SP = Record<string, string | string[] | undefined>;

export default async function ShopifyPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const raw = await searchParams;
  const sp = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, (Array.isArray(v) ? v[0] : v) ?? ""])) as Record<string, string>;
  const configured = shopifyConfigured();
  const admin = isAdmin(user.email);
  const stores = await db.shopifyStore.findMany({ where: { userId: user.id }, orderBy: { installedAt: "desc" }, include: { _count: { select: { products: true } } } });
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

  // Opened from Shopify (Apps list in Shopify admin, or an install link): the URL carries ?shop&hmac&host&timestamp.
  // A genuine launch connects the store straight away; if it is already connected there is nothing to do.
  let launchedConnected = false;
  if (configured && sp.shop && sp.hmac) {
    const shop = normalizeShop(sp.shop);
    if (shop && shop === sp.shop && verifyQueryHmac(new URLSearchParams(sp), process.env.SHOPIFY_API_SECRET!)) {
      const existing = stores.find((s) => s.shopDomain === shop);
      if (existing?.status === "connected" && existing.refreshTokenEnc) launchedConnected = true;
      else redirect(`/api/shopify/auth?shop=${encodeURIComponent(shop)}`);
    }
  }

  const anyStore = stores.length > 0;
  return (
    <>
      <PageHeader title="Shopify" description="Connect your store so replies can use your real prices, sizes and stock." />

      {(sp.connected || launchedConnected) && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"><Check className="h-4 w-4 shrink-0" /> {launchedConnected ? "Your store is connected." : "Store connected. We are fetching your products now, this takes a moment."}</div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {sp.error}</div>
      )}

      {!configured && admin && (
        <Card>
          <CardHeader><CardTitle>Admin: Shopify app is not configured on this server</CardTitle><CardDescription>Only visible to admins (ADMIN_EMAILS). One-time setup in the Shopify Partner dashboard, then add the keys to the environment.</CardDescription></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
              <li>Partner dashboard, Apps, Create app. Distribution: <b className="text-foreground">Public</b> (or custom distribution while testing).</li>
              <li>Set the URLs below, scopes <code className="rounded bg-muted px-1">{SHOPIFY_SCOPES()}</code>, and the compliance webhook URLs to the webhook URL.</li>
              <li>Put <code className="rounded bg-muted px-1">SHOPIFY_API_KEY</code> and <code className="rounded bg-muted px-1">SHOPIFY_API_SECRET</code> in the environment, then restart.</li>
            </ol>
            <CopyField label="App URL" value={`${appUrl}/dashboard/shopify`} />
            <CopyField label="Allowed redirection URL" value={appUrl ? redirectUri() : ""} />
            <CopyField label="Webhook URL (also for the 3 compliance webhooks)" value={`${appUrl}/api/shopify/webhooks`} />
          </CardContent>
        </Card>
      )}
      {!configured && !admin && (
        <Card className="p-8 text-center"><ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Shopify connection is not available yet</p><p className="mt-1 text-sm text-muted-foreground">We are finishing the setup. Please check back soon.</p></Card>
      )}

      {configured && !anyStore && (
        <Card>
          <CardHeader>
            <div className="mb-1 grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary"><ShoppingBag className="h-5 w-5" /></div>
            <CardTitle className="text-lg">Connect your Shopify store</CardTitle>
            <CardDescription>Enter your store address. We take you to Shopify to approve, then bring you straight back here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ShopifyConnectForm defaultShop={sp.shop ?? ""} />
            <ul className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <li className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Read-only access to <b className="text-foreground">products and stock</b>. We never touch orders or customers, and cannot change your store.</li>
              <li className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Prices and stock stay up to date automatically when you edit products in Shopify.</li>
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
                <Badge variant={connected ? "success" : "warning"}>{connected ? "Connected" : "Reconnect needed"}</Badge>
                {connected && s.syncStatus === "error" && <Badge variant="warning">Needs attention</Badge>}
              </div>
            </div>

            {connected ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
                  <div><p className="font-display text-3xl tabular-nums leading-none">{fmt(s._count.products)}</p><p className="mt-1 text-xs text-muted-foreground">Products</p></div>
                  <div><p className="font-display text-3xl leading-none">{s.currency ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">Store currency</p></div>
                  <div><p className="text-sm font-medium">{syncing ? "Updating…" : s.lastSyncAt ? timeAgo(s.lastSyncAt) : "Not yet"}</p><p className="mt-1 text-xs text-muted-foreground">Last updated</p></div>
                  <div><p className="text-sm font-medium">Read-only</p><p className="mt-1 text-xs text-muted-foreground">Products and stock</p></div>
                </div>
                {s.syncError && <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">{admin ? s.syncError : "We could not refresh your products just now. Press Update products to try again, or reconnect the store if it keeps happening."}</p>}
                <div className="mt-5"><StoreActions id={s.id} name={s.shopName ?? s.shopDomain} syncing={syncing} /></div>
                <div className="mt-6 border-t pt-5">
                  <h3 className="font-semibold">Store notes for your AI agents</h3>
                  <p className="mb-3 mt-1 text-sm text-muted-foreground">Delivery times, COD, returns, size guide. Write it once and every AI agent uses it, so customers get real answers instead of “our team will contact you”.</p>
                  <StoreNotes id={s.id} initial={s.notes ?? ""} />
                </div>
              </>
            ) : (
              <div className="mt-5 space-y-3 border-t pt-5">
                <p className="text-sm text-muted-foreground">{legacyToken ? "Your store connection needs to be renewed. Reconnect once to fix it. Your reel and product links are kept." : "The app was removed from this store, or its access ran out. Connect again to carry on. Your reel and product links are kept."}</p>
                {admin && s.syncError && <p className="text-xs text-muted-foreground">Admin note: {s.syncError}</p>}
                <ShopifyConnectForm defaultShop={s.shopDomain} label="Reconnect" />
              </div>
            )}
          </Card>
        );
      })}

      {configured && stores.some((s) => s.status === "connected" && !!s.refreshTokenEnc) && (
        <details className="text-sm"><summary className="cursor-pointer text-muted-foreground hover:text-foreground">Connect another store</summary><div className="mt-3 max-w-xl"><ShopifyConnectForm /></div></details>
      )}
    </>
  );
}
