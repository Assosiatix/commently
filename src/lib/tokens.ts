import { db } from "./db";
import { decrypt, encrypt } from "./crypto";
import { refreshLongLived } from "./instagram";

/** Refreshes long-lived tokens that expire within `withinDays` (token must be >24h old). */
export async function refreshExpiringTokens(withinDays = 20) {
  const now = Date.now();
  const accounts = await db.igAccount.findMany({
    where: {
      status: "active",
      tokenExpiresAt: { lt: new Date(now + withinDays * 864e5) },
      tokenRefreshedAt: { lt: new Date(now - 864e5) },
    },
  });
  let ok = 0;
  let failed = 0;
  for (const a of accounts) {
    try {
      const r = await refreshLongLived(decrypt(a.accessTokenEnc));
      await db.igAccount.update({
        where: { id: a.id },
        data: { accessTokenEnc: encrypt(r.accessToken), tokenExpiresAt: new Date(Date.now() + r.expiresIn * 1000), tokenRefreshedAt: new Date() },
      });
      ok++;
    } catch (e) {
      failed++;
      if (a.tokenExpiresAt.getTime() < Date.now()) await db.igAccount.update({ where: { id: a.id }, data: { status: "expired" } });
      console.error("[tokens] refresh failed", a.id, e instanceof Error ? e.message : e);
    }
  }
  return { checked: accounts.length, ok, failed };
}
