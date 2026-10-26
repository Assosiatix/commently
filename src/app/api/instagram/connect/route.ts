import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { buildAuthUrl, STATE_COOKIE } from "@/lib/instagram";


/** Opened inside the "Connect Instagram" popup. Sends the user to Instagram's consent screen. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.APP_URL));
  const state = randomBytes(16).toString("hex");
  const jwt = await new SignJWT({ state })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set(STATE_COOKIE, jwt, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/instagram", maxAge: 600 });
  return res;
}
