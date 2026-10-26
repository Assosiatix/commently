/**
 * Shopify public app (OAuth install) + Admin GraphQL client + catalog sync.
 * Docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
 */
import { createHmac } from "node:crypto";
import { db } from "./db";
import { decrypt, encrypt, safeEqual } from "./crypto";

export const SHOPIFY_SCOPES = () => process.env.SHOPIFY_SCOPES || "read_products,read_inventory";
const apiVersion = () => process.env.SHOPIFY_API_VERSION || "2026-07";
const appUrl = () => (process.env.APP_URL ?? "").replace(/\/$/, "");

export const shopifyConfigured = () => !!(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET && process.env.APP_URL);
export const STATE_COOKIE = "shopify_oauth";
export const redirectUri = () => `${appUrl()}/api/shopify/callback`;

export class ShopifyError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/** Accepts "mystore", "mystore.myshopify.com", a pasted admin URL, or admin.shopify.com/store/mystore. Returns null if it is not a myshopify domain. */
export function normalizeShop(input: string): string | null {
  let v = input.trim().toLowerCase();
  if (!v) return null;
  v = v.replace(/^https?:\/\//, "");
  const admin = v.match(/^admin\.shopify\.com\/store\/([a-z0-9-]+)/);
  if (admin) v = `${admin[1]}.myshopify.com`;
  v = v.split(/[/?#]/)[0];
  if (/^[a-z0-9][a-z0-9-]*$/.test(v)) v = `${v}.myshopify.com`;
  return SHOP_RE.test(v) ? v : null;
}

/** Verifies the `hmac` query param Shopify adds to OAuth redirects (hex HMAC-SHA256 of the sorted remaining params). */
export function verifyQueryHmac(params: URLSearchParams, secret: string): boolean {
  const given = params.get("hmac");
  if (!given || !secret) return false;
  const message = [...params.entries()]
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return safeEqual(createHmac("sha256", secret).update(message).digest("hex"), given);
}

/** Verifies X-Shopify-Hmac-Sha256 (base64 HMAC-SHA256 of the raw webhook body). */
export function verifyWebhookHmac(raw: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  return safeEqual(createHmac("sha256", secret).update(raw, "utf8").digest("base64"), header);
}

export function authorizeUrl(shop: string, state: string) {
  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", process.env.SHOPIFY_API_KEY!);
  u.searchParams.set("scope", SHOPIFY_SCOPES());
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("state", state);
  return u.toString();
}

type TokenResponse = { access_token: string; scope?: string; expires_in?: number; refresh_token?: string; refresh_token_expires_in?: number };

/** Shopify only accepts expiring offline tokens now (1h access token + rotating 90-day refresh token). Requests are form-encoded. */
async function tokenRequest(shop: string, body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: process.env.SHOPIFY_API_KEY ?? "", client_secret: process.env.SHOPIFY_API_SECRET ?? "", ...body }),
  });
  const j = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & { error_description?: string; error?: string };
  if (!res.ok || !j.access_token) throw new ShopifyError(j.error_description || j.error || `Shopify token request failed (${res.status})`, res.status);
  return j as TokenResponse;
}

export const exchangeCode = (shop: string, code: string) => tokenRequest(shop, { code, expiring: "1" });

const REFRESH_MARGIN_MS = 5 * 60_000;
const refreshing = new Map<string, Promise<string>>();

type TokenRow = { id: string; shopDomain: string; accessTokenEnc: string; refreshTokenEnc: string | null; tokenExpiresAt: Date | null };

/** Returns a usable Admin API token, refreshing it first when it is about to expire. */
async function accessToken(store: TokenRow) {
  if (!store.accessTokenEnc) throw new ShopifyError("Store is not connected", 401);
  const stale = !!store.tokenExpiresAt && store.tokenExpiresAt.getTime() < Date.now() + REFRESH_MARGIN_MS;
  if (!stale) return decrypt(store.accessTokenEnc);
  if (!store.refreshTokenEnc) throw new ShopifyError("Shopify access expired. Reconnect the store.", 401);
  // Each refresh retires the previous refresh token, so only one refresh per store may run at a time.
  let p = refreshing.get(store.id);
  if (!p) {
    p = refreshToken(store.id).finally(() => refreshing.delete(store.id));
    refreshing.set(store.id, p);
  }
  return p;
}

async function refreshToken(storeId: string) {
  const fresh = await db.shopifyStore.findUnique({ where: { id: storeId } });
  if (!fresh?.accessTokenEnc) throw new ShopifyError("Store is not connected", 401);
  // Another request (or instance) may have refreshed it a moment ago.
  if (fresh.tokenExpiresAt && fresh.tokenExpiresAt.getTime() > Date.now() + REFRESH_MARGIN_MS) return decrypt(fresh.accessTokenEnc);
  if (!fresh.refreshTokenEnc) throw new ShopifyError("Shopify access expired. Reconnect the store.", 401);
  let t: TokenResponse;
  try {
    t = await tokenRequest(fresh.shopDomain, { grant_type: "refresh_token", refresh_token: decrypt(fresh.refreshTokenEnc) });
  } catch (e) {
    // 400/401 = the refresh token is dead (revoked, expired or used up): the merchant has to install again.
    if (e instanceof ShopifyError && (e.status === 400 || e.status === 401)) {
      await db.shopifyStore.update({ where: { id: storeId }, data: { status: "disconnected", accessTokenEnc: "", refreshTokenEnc: null, tokenExpiresAt: null, webhooksOk: false, syncStatus: "error", syncError: "Shopify access expired. Reconnect the store." } });
    }
    throw e;
  }
  await db.shopifyStore.update({
    where: { id: storeId },
    data: {
      accessTokenEnc: encrypt(t.access_token),
      refreshTokenEnc: t.refresh_token ? encrypt(t.refresh_token) : fresh.refreshTokenEnc,
      tokenExpiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
    },
  });
  return t.access_token;
}

type StoreRow = NonNullable<Awaited<ReturnType<typeof db.shopifyStore.findUnique>>>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Admin GraphQL call with retry on throttling. */
export async function gql<T = any>(store: StoreRow, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = await accessToken(store);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://${store.shopDomain}/admin/api/${apiVersion()}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 429 && attempt < 3) { await sleep(1000 * (attempt + 1)); continue; }
    if (!res.ok) throw new ShopifyError(`Shopify API ${res.status}: ${(await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200)}`, res.status);
    const j = (await res.json()) as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };
    if (j.errors?.length) {
      if (j.errors.some((e) => e.extensions?.code === "THROTTLED") && attempt < 3) { await sleep(1000 * (attempt + 1)); continue; }
      throw new ShopifyError(j.errors.map((e) => e.message).join("; ").slice(0, 300));
    }
    return j.data as T;
  }
}

// ---------------------------------------------------------------------------------------------
// Catalog sync
// ---------------------------------------------------------------------------------------------
const PRODUCT_FIELDS = `
  id title handle description vendor productType tags status onlineStoreUrl totalInventory
  featuredImage { url }
  options { name values }
  variants(first: 50) { nodes { id title sku price compareAtPrice inventoryQuantity availableForSale selectedOptions { name value } image { url } inventoryItem { id } } }
`;

type GqlProduct = {
  id: string; title: string; handle: string; description?: string; vendor?: string; productType?: string; tags?: string[]; status?: string;
  onlineStoreUrl?: string | null; totalInventory?: number | null; featuredImage?: { url: string } | null; options?: { name: string; values: string[] }[];
  variants?: { nodes: { id: string; title: string; sku?: string | null; price: string; compareAtPrice?: string | null; inventoryQuantity?: number | null; availableForSale?: boolean; selectedOptions?: { name: string; value: string }[]; image?: { url: string } | null; inventoryItem?: { id: string } | null }[] };
};

export async function upsertProduct(store: Pick<StoreRow, "id" | "primaryUrl" | "shopDomain">, p: GqlProduct) {
  const base = (store.primaryUrl || `https://${store.shopDomain}`).replace(/\/$/, "");
  const data = {
    title: p.title,
    handle: p.handle,
    description: (p.description ?? "").slice(0, 4000),
    vendor: p.vendor || null,
    productType: p.productType || null,
    tags: p.tags ?? [],
    status: p.status ?? "ACTIVE",
    url: p.onlineStoreUrl || `${base}/products/${p.handle}`,
    imageUrl: p.featuredImage?.url ?? null,
    options: (p.options ?? []) as object,
    totalInventory: p.totalInventory ?? null,
    syncedAt: new Date(),
  };
  const product = await db.product.upsert({
    where: { storeId_shopifyId: { storeId: store.id, shopifyId: p.id } },
    create: { storeId: store.id, shopifyId: p.id, ...data },
    update: data,
  });
  const variants = p.variants?.nodes ?? [];
  await db.$transaction([
    db.variant.deleteMany({ where: { productId: product.id, shopifyId: { notIn: variants.map((v) => v.id) } } }),
    ...variants.map((v) => {
      const vd = {
        title: v.title,
        sku: v.sku || null,
        price: v.price,
        compareAtPrice: v.compareAtPrice || null,
        inventoryQty: v.inventoryQuantity ?? null,
        availableForSale: v.availableForSale ?? true,
        options: (v.selectedOptions ?? []) as object,
        imageUrl: v.image?.url ?? null,
        inventoryItemId: v.inventoryItem?.id ?? null,
      };
      return db.variant.upsert({ where: { productId_shopifyId: { productId: product.id, shopifyId: v.id } }, create: { productId: product.id, shopifyId: v.id, ...vd }, update: vd });
    }),
  ]);
  return product;
}

/** Pulls shop name/currency/storefront URL. */
export async function refreshShopInfo(store: StoreRow) {
  const d = await gql<{ shop: { name: string; currencyCode: string; primaryDomain?: { url: string } } }>(store, `{ shop { name currencyCode primaryDomain { url } } }`);
  return db.shopifyStore.update({ where: { id: store.id }, data: { shopName: d.shop.name, currency: d.shop.currencyCode, primaryUrl: d.shop.primaryDomain?.url ?? null } });
}

/**
 * Full catalog sync. Resumable: if the time budget runs out the cursor is saved (status "partial") and the next call continues.
 * Products that vanished from Shopify are removed once a sync reaches the end.
 */
export async function syncStore(storeId: string, budgetMs = 45_000) {
  let store = await db.shopifyStore.findUnique({ where: { id: storeId } });
  if (!store || store.status !== "connected") return { ok: false as const, reason: "not connected" };
  const t0 = Date.now();
  try {
    const resuming = store.syncStatus === "partial" && !!store.syncCursor;
    store = await db.shopifyStore.update({ where: { id: store.id }, data: { syncStatus: "syncing", syncError: null, ...(resuming ? {} : { syncStartedAt: new Date(), syncCursor: null }) } });
    if (!resuming || !store.shopName) store = await refreshShopInfo(store);

    let cursor = resuming ? store.syncCursor : null;
    let count = 0;
    for (;;) {
      const d: { products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: GqlProduct[] } } = await gql(
        store,
        `query Products($cursor: String) { products(first: 10, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { ${PRODUCT_FIELDS} } } }`,
        { cursor },
      );
      for (const p of d.products.nodes) { await upsertProduct(store, p); count++; }
      cursor = d.products.pageInfo.endCursor;
      if (!d.products.pageInfo.hasNextPage) break;
      if (Date.now() - t0 > budgetMs) {
        await db.shopifyStore.update({ where: { id: store.id }, data: { syncStatus: "partial", syncCursor: cursor } });
        return { ok: true as const, partial: true, synced: count };
      }
      await db.shopifyStore.update({ where: { id: store.id }, data: { syncCursor: cursor } });
    }
    await db.product.deleteMany({ where: { storeId: store.id, syncedAt: { lt: store.syncStartedAt ?? new Date(t0) } } });
    await db.shopifyStore.update({ where: { id: store.id }, data: { syncStatus: "idle", syncCursor: null, lastSyncAt: new Date(), syncError: null } });
    return { ok: true as const, partial: false, synced: count };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.shopifyStore.update({ where: { id: storeId }, data: { syncStatus: "error", syncError: msg.slice(0, 300) } });
    return { ok: false as const, reason: msg };
  }
}

/** Re-fetches one product (webhook path). Deletes it locally if Shopify no longer has it. */
export async function syncOneProduct(storeId: string, gid: string) {
  const store = await db.shopifyStore.findUnique({ where: { id: storeId } });
  if (!store || store.status !== "connected") return;
  const d = await gql<{ node: (GqlProduct & { __typename?: string }) | null }>(store, `query One($id: ID!) { node(id: $id) { ... on Product { ${PRODUCT_FIELDS} } } }`, { id: gid });
  if (!d.node || !d.node.id) await db.product.deleteMany({ where: { storeId, shopifyId: gid } });
  else await upsertProduct(store, d.node);
}

export const productGid = (numericId: string | number) => `gid://shopify/Product/${numericId}`;
export const inventoryItemGid = (numericId: string | number) => `gid://shopify/InventoryItem/${numericId}`;

// ---------------------------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------------------------
export const WEBHOOK_TOPICS = ["PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_DELETE", "INVENTORY_LEVELS_UPDATE", "APP_UNINSTALLED"] as const;

export async function registerWebhooks(storeId: string) {
  const store = await db.shopifyStore.findUnique({ where: { id: storeId } });
  if (!store) return false;
  // Subscriptions are declared in shopify.app.toml and pushed with `shopify app deploy`; registering them here too would double every event.
  if (process.env.SHOPIFY_MANAGED_WEBHOOKS === "true") {
    await db.shopifyStore.update({ where: { id: storeId }, data: { webhooksOk: true } });
    return true;
  }
  const callbackUrl = `${appUrl()}/api/shopify/webhooks`;
  let ok = true;
  for (const topic of WEBHOOK_TOPICS) {
    try {
      const d = await gql<{ webhookSubscriptionCreate: { userErrors: { message: string }[] } }>(
        store,
        `mutation($topic: WebhookSubscriptionTopic!, $url: URL!) { webhookSubscriptionCreate(topic: $topic, webhookSubscription: { callbackUrl: $url, format: JSON }) { userErrors { field message } } }`,
        { topic, url: callbackUrl },
      );
      const errs = d.webhookSubscriptionCreate.userErrors.filter((e) => !/already been taken/i.test(e.message));
      if (errs.length) { ok = false; console.error("[shopify] webhook", topic, errs.map((e) => e.message).join("; ")); }
    } catch (e) {
      ok = false;
      console.error("[shopify] webhook", topic, e instanceof Error ? e.message : e);
    }
  }
  await db.shopifyStore.update({ where: { id: storeId }, data: { webhooksOk: ok } });
  return ok;
}
