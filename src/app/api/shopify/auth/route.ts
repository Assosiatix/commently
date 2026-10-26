import { SignJWT } from "jose";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { authorizeUrl, normalizeShop, shopifyConfigured, STATE_COOKIE } from "@/lib/shopify";

const back = (msg: string) => NextResponse.redirect(new URL(`/dashboard/shopify?error=${encodeURIComponent(msg)}`, process.env.APP_URL));

// Step 1: the merchant typed their store URL in our dashboard -> send them to Shopify's install/consent screen.
export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.redirect(new URL("/login?next=/dashboard/shopify", process.env.APP_URL ?? req.url));
  if (!shopifyConfigured()) return back("Shopify is not configured on the server yet.");

  const shop = normalizeShop(new URL(req.url).searchParams.get("shop") ?? "");
  if (!shop) return back("That does not look like a Shopify store address. Use your-store.myshopify.com (Shopify admin, Settings, Domains).");

  const state = randomBytes(16).toString("hex");
  const cookie = await new SignJWT({ state, shop }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const res = NextResponse.redirect(authorizeUrl(shop, state));
  res.cookies.set(STATE_COOKIE, cookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/shopify", maxAge: 600 });
  return res;
}
