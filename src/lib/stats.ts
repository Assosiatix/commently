import { db } from "./db";

const DAY = 864e5;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Dashboard numbers for the last `days` days vs the `days` before. All scoped to one user. */
export async function getOverviewStats(userId: string, days = 14) {
  const now = Date.now();
  const since = new Date(now - days * DAY);
  const prevSince = new Date(now - 2 * days * DAY);
  const own = { account: { userId } };

  const [logs, prevOpeners, convos, prevConvos] = await Promise.all([
    db.eventLog.findMany({ where: { ...own, createdAt: { gte: since } }, select: { createdAt: true, status: true } }),
    db.eventLog.count({ where: { ...own, status: { in: ["SENT", "PARTIAL"] }, createdAt: { gte: prevSince, lt: since } } }),
    db.conversation.findMany({ where: { ...own, openerAt: { gte: since } }, select: { openerAt: true, status: true, followUpAt: true } }),
    db.conversation.count({ where: { ...own, openerAt: { gte: prevSince, lt: since }, repliedAt: { not: null } } }),
  ]);

  // Bucket per UTC day, oldest first, so the chart always has `days` bars.
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * DAY);
    return { key: dayKey(d), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), dms: 0, followUps: 0 };
  });
  const byKey = new Map(series.map((s) => [s.key, s]));
  for (const l of logs) if (l.status === "SENT" || l.status === "PARTIAL") byKey.get(dayKey(l.createdAt))!.dms++;
  for (const c of convos) if (c.status === "FOLLOWUP_SENT" && c.followUpAt) byKey.get(dayKey(c.followUpAt))!.followUps++;

  const dms = logs.filter((l) => l.status === "SENT" || l.status === "PARTIAL").length;
  const failed = logs.filter((l) => l.status === "FAILED").length;
  const skipped = logs.filter((l) => l.status === "SKIPPED").length;
  const replied = convos.filter((c) => c.status !== "OPENER_SENT").length;
  const followUps = convos.filter((c) => c.status === "FOLLOWUP_SENT").length;
  const awaiting = convos.filter((c) => c.status === "OPENER_SENT").length;

  return { days, series, dms, prevDms: prevOpeners, failed, skipped, replied, prevReplied: prevConvos, followUps, awaiting, triggers: logs.length };
}

/** Per-automation counters (all time) for the automations list. */
export async function getAutomationStats(userId: string) {
  const own = { account: { userId } };
  const [logs, convos] = await Promise.all([
    db.eventLog.groupBy({ by: ["automationId", "status"], where: own, _count: { _all: true } }),
    db.conversation.groupBy({ by: ["automationId", "status"], where: own, _count: { _all: true } }),
  ]);
  const out = new Map<string, { triggers: number; dms: number; failed: number; replied: number; followUps: number }>();
  const get = (id: string) => out.get(id) ?? out.set(id, { triggers: 0, dms: 0, failed: 0, replied: 0, followUps: 0 }).get(id)!;
  for (const r of logs) {
    const s = get(r.automationId);
    s.triggers += r._count._all;
    if (r.status === "SENT" || r.status === "PARTIAL") s.dms += r._count._all;
    if (r.status === "FAILED") s.failed += r._count._all;
  }
  for (const r of convos) {
    const s = get(r.automationId);
    if (r.status !== "OPENER_SENT") s.replied += r._count._all;
    if (r.status === "FOLLOWUP_SENT") s.followUps += r._count._all;
  }
  return out;
}
