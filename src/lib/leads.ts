import { db } from "./db";

/** Creates or updates the lead for someone who commented on a promoted post and got a DM. */
export async function recordLead(input: { accountId: string; igsid: string; username?: string | null; comment: string; intent?: string | null; products: string[]; needsAttention?: boolean }) {
  const comment = input.comment.slice(0, 300);
  const existing = await db.lead.findUnique({ where: { accountId_igsid: { accountId: input.accountId, igsid: input.igsid } } });
  if (!existing) {
    await db.lead.create({ data: { accountId: input.accountId, igsid: input.igsid, username: input.username ?? null, lastComment: comment, lastIntent: input.intent ?? null, products: [...new Set(input.products)], needsAttention: !!input.needsAttention } });
    return;
  }
  await db.lead.update({
    where: { id: existing.id },
    data: {
      username: input.username ?? existing.username,
      lastSeenAt: new Date(),
      commentCount: { increment: 1 },
      lastComment: comment,
      lastIntent: input.intent ?? existing.lastIntent,
      products: [...new Set([...existing.products, ...input.products])],
      // stays flagged until a human marks it resolved
      needsAttention: existing.needsAttention || !!input.needsAttention,
    },
  });
}
