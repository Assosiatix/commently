import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { processWebhookPayload, type WebhookPayload } from "./engine";

export const MAX_ATTEMPTS = 5;

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 500);

/** Stores a verified delivery before it is acked, so a crash/timeout after the 200 can't lose it. */
export async function storeWebhookEvent(payload: WebhookPayload) {
  const entries = payload.entry ?? [];
  const fields = new Set<string>();
  for (const e of entries) {
    for (const c of e.changes ?? []) if (c.field) fields.add(c.field);
    if ((e as { messaging?: unknown[] }).messaging?.length) fields.add("messages");
  }
  return db.webhookEvent.create({
    data: {
      object: String(payload.object ?? ""),
      entryIds: entries.map((e) => e.id).filter((x): x is string => !!x),
      fields: [...fields],
      payload: payload as Prisma.InputJsonValue,
    },
  });
}

/** Runs the engine for one stored event and records the outcome. Safe to call repeatedly (engine is idempotent). */
export async function processStoredEvent(id: string) {
  const ev = await db.webhookEvent.update({ where: { id }, data: { attempts: { increment: 1 } } });
  const errors: string[] = [];
  try {
    await processWebhookPayload(ev.payload as WebhookPayload, (e) => errors.push(errMsg(e)));
  } catch (e) {
    errors.push(errMsg(e));
  }
  await db.webhookEvent.update({
    where: { id },
    data: errors.length
      ? { status: "FAILED", error: errors.slice(0, 3).join(" | ").slice(0, 500) }
      : { status: "PROCESSED", error: null, processedAt: new Date() },
  });
  return errors.length === 0;
}

/** Cron: retries events that failed or were left RECEIVED (e.g. function killed mid-processing). */
export async function retryPendingEvents(limit = 50) {
  const stale = new Date(Date.now() - 2 * 60 * 1000);
  const pending = await db.webhookEvent.findMany({
    where: {
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "FAILED" }, { status: "RECEIVED", receivedAt: { lt: stale } }],
    },
    orderBy: { receivedAt: "asc" },
    take: limit,
    select: { id: true },
  });
  let ok = 0;
  for (const { id } of pending) if (await processStoredEvent(id)) ok++;
  // keep the table small: processed events older than 14 days are not needed
  const purged = await db.webhookEvent.deleteMany({ where: { status: "PROCESSED", receivedAt: { lt: new Date(Date.now() - 14 * 864e5) } } });
  return { retried: pending.length, succeeded: ok, purged: purged.count };
}
