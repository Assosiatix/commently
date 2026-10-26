import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

// Spreadsheet apps run cells that start with = + - @ as formulas, so those are neutralised.
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const leads = await db.lead.findMany({ where: { account: { userId } }, include: { account: { select: { username: true } } }, orderBy: { lastSeenAt: "desc" }, take: 5000 });
  const head = ["username", "instagram", "your_account", "products", "last_intent", "last_comment", "comments", "first_seen", "last_seen", "status", "needs_attention", "note"];
  const rows = leads.map((l) => [l.username ?? l.igsid, l.username ? `https://instagram.com/${l.username}` : "", l.account.username, l.products.join("; "), l.lastIntent, l.lastComment, l.commentCount, l.firstSeenAt.toISOString(), l.lastSeenAt.toISOString(), l.status, l.needsAttention ? "yes" : "no", l.note]);
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
