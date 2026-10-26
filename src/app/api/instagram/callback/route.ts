import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { PLANS } from "@/lib/plans";
import { getSessionUserId } from "@/lib/session";
import { exchangeCode, getProfile, STATE_COOKIE, subscribeWebhooks, toLongLived } from "@/lib/instagram";

function page(payload: { ok: boolean; username?: string; error?: string; warning?: string }) {
  const origin = new URL(process.env.APP_URL!).origin;
  const json = JSON.stringify({ type: "ig-connect", ...payload }).replace(/</g, "\\u003c");
  const msg = payload.ok ? `Connected @${payload.username ?? ""}. You can close this window.` : `Could not connect: ${payload.error ?? "unknown error"}`;
  const safe = msg.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<!doctype html><meta charset="utf-8"><title>Instagram</title>
<body style="font-family:system-ui;background:#0b1020;color:#e6edf7;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
<div><p style="font-size:18px">${safe}</p></div>
<script>
(function(){var d=${json};try{if(window.opener){window.opener.postMessage(d,${JSON.stringify(origin)});setTimeout(function(){window.close()},d.ok?600:3000);return}}catch(e){}
setTimeout(function(){location.href="/dashboard/accounts"},1500)})();
</script>`;
  const res = new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  res.cookies.delete({ name: STATE_COOKIE, path: "/api/instagram" });
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const err = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (err) return page({ ok: false, error: err === "access_denied" ? "Permission was denied" : err });

  const userId = await getSessionUserId();
  if (!userId) return page({ ok: false, error: "Your session expired. Log in and try again." });

  // CSRF check: state param must match the signed cookie created in /connect, for this same user.
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = (await cookies()).get(STATE_COOKIE)?.value;
  if (!code || !state || !cookie) return page({ ok: false, error: "Missing OAuth data. Start again." });
  try {
    const { payload } = await jwtVerify(cookie, new TextEncoder().encode(process.env.AUTH_SECRET));
    if (payload.state !== state || payload.sub !== userId) return page({ ok: false, error: "Invalid OAuth state. Start again." });
  } catch {
    return page({ ok: false, error: "OAuth session expired. Start again." });
  }

  try {
    const short = await exchangeCode(code);
    const long = await toLongLived(short.accessToken);
    const profile = await getProfile(long.accessToken);

    const existing = await db.igAccount.findUnique({ where: { igUserId: profile.igUserId } });
    if (existing && existing.userId !== userId) return page({ ok: false, error: "This Instagram account is already connected to another user." });

    if (!existing) {
      const me = await db.user.findUnique({ where: { id: userId }, select: { plan: true } });
      const plan = PLANS[me?.plan ?? "FREE"];
      if ((await db.igAccount.count({ where: { userId } })) >= plan.accounts) return page({ ok: false, error: `Your ${plan.name} plan allows ${plan.accounts} Instagram account(s). Upgrade to connect more.` });
    }

    const data = {
      userId,
      appScopedId: profile.appScopedId ?? short.userId,
      username: profile.username,
      profilePictureUrl: profile.profilePictureUrl,
      accountType: profile.accountType,
      accessTokenEnc: encrypt(long.accessToken),
      tokenExpiresAt: new Date(Date.now() + long.expiresIn * 1000),
      tokenRefreshedAt: new Date(),
      scopes: short.permissions,
      status: "active",
    };
    const account = await db.igAccount.upsert({ where: { igUserId: profile.igUserId }, create: { igUserId: profile.igUserId, ...data }, update: data });

    let warning: string | undefined;
    try {
      await subscribeWebhooks(profile.igUserId, long.accessToken);
      await db.igAccount.update({ where: { id: account.id }, data: { webhookSubscribed: true } });
    } catch (e) {
      warning = `Connected, but webhook subscription failed: ${e instanceof Error ? e.message : e}`;
    }
    return page({ ok: true, username: profile.username, warning });
  } catch (e) {
    console.error("[ig-callback]", e instanceof Error ? e.message : e);
    return page({ ok: false, error: e instanceof Error ? e.message : "Connection failed" });
  }
}
