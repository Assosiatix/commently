import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { exchangeCode, normalizeShop, registerWebhooks, shopifyConfigured, STATE_COOKIE, syncStore, verifyQueryHmac } from "@/lib/shopify";

function done(path: string) {
  const res = NextResponse.redirect(new URL(path, process.env.APP_URL));
  res.cookies.delete({ name: STATE_COOKIE, path: "/api/shopify" });
  return res;
}
const fail = (msg: string) => done(`/dashboard/shopify?error=${encodeURIComponent(msg)}`);

// Step 2: Shopify sends the merchant back here with ?code&shop&state&hmac after they approve the install.
export async function GET(req: Request) {
  if (!shopifyConfigured()) return fail("Shopify is not configured on the server yet.");
  const p = new URL(req.url).searchParams;
  if (p.get("error")) return fail(p.get("error_description") || "Install was cancelled.");

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.redirect(new URL("/login?next=/dashboard/shopify", process.env.APP_URL));

  // 1. the request really comes from Shopify, for a real myshopify domain
  const shop = normalizeShop(p.get("shop") ?? "");
  if (!shop || shop !== p.get("shop")) return fail("Invalid store address.");
  if (!verifyQueryHmac(p, process.env.SHOPIFY_API_SECRET!)) return fail("Shopify signature check failed. Start the install again.");

  // 2. CSRF: state must match the signed cookie we set for this same user and shop
  const code = p.get("code");
  const state = p.get("state");
  const cookie = (await cookies()).get(STATE_COOKIE)?.value;
  if (!code || !state || !cookie) return fail("Install session expired. Start again.");
  try {
    const { payload } = await jwtVerify(cookie, new TextEncoder().encode(process.env.AUTH_SECRET));
    if (payload.state !== state || payload.sub !== userId || payload.shop !== shop) return fail("Invalid install state. Start again.");
  } catch {
    return fail("Install session expired. Start again.");
  }

  try {
    const t = await exchangeCode(shop, code);
    // Shopify only accepts expiring offline tokens (with a refresh token); a plain one would fail on the first API call.
    if (!t.refresh_token) return fail("Shopify did not issue an expiring access token. Please try the install again.");
    const scopes = t.scope ?? "";
    if (!scopes.split(",").includes("read_products")) return fail("The app needs permission to read products. Install again and approve it.");

    const existing = await db.shopifyStore.findUnique({ where: { shopDomain: shop } });
    if (existing && existing.userId !== userId) return fail("This store is already connected to another account.");

    const data = {
      userId,
      accessTokenEnc: encrypt(t.access_token),
      refreshTokenEnc: t.refresh_token ? encrypt(t.refresh_token) : null,
      tokenExpiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
      scopes,
      status: "connected",
      syncStatus: "idle",
      syncError: null,
      syncCursor: null,
    };
    const store = await db.shopifyStore.upsert({ where: { shopDomain: shop }, create: { shopDomain: shop, ...data }, update: data });

    // Register webhooks and pull the catalogue after the merchant has been sent back to the dashboard.
    after(async () => {
      try {
        await registerWebhooks(store.id);
        await syncStore(store.id);
      } catch (e) {
        console.error("[shopify] post-install", e instanceof Error ? e.message : e);
      }
    });
    return done("/dashboard/shopify?connected=1");
  } catch (e) {
    console.error("[shopify-callback]", e instanceof Error ? e.message : e);
    return fail(e instanceof Error ? e.message : "Could not connect the store.");
  }
}
