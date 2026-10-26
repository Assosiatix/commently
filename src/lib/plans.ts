import { db } from "./db";
import { PLANS } from "./plan-data";
import type { Plan } from "@/generated/prisma/client";

export { PLANS, PLAN_ORDER, unlimited } from "./plan-data";
export type { PlanInfo } from "./plan-data";

export const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

/** DMs this calendar month: first DMs that went out plus follow-ups. */
export async function dmsUsedThisMonth(userId: string) {
  const since = monthStart();
  const [openers, followUps, agentChats] = await Promise.all([
    db.eventLog.count({ where: { account: { userId }, status: { in: ["SENT", "PARTIAL"] }, createdAt: { gte: since } } }),
    db.conversation.count({ where: { account: { userId }, status: "FOLLOWUP_SENT", followUpAt: { gte: since } } }),
    // answers an AI agent sent inside an ongoing DM chat (the first answer to a comment is already counted as an opener)
    db.aiUsage.count({ where: { userId, source: { in: ["message", "message_fallback"] }, createdAt: { gte: since } } }),
  ]);
  return openers + followUps + agentChats;
}

/** AI-written answers this calendar month (counted from the activity log). */
export async function aiRepliesUsedThisMonth(userId: string) {
  return db.aiUsage.count({ where: { userId, source: { in: ["comment", "message"] }, createdAt: { gte: monthStart() } } });
}

export async function getUsage(userId: string, plan: Plan) {
  const [dms, accounts, automations, aiReplies] = await Promise.all([
    dmsUsedThisMonth(userId),
    db.igAccount.count({ where: { userId } }),
    db.automation.count({ where: { userId } }),
    aiRepliesUsedThisMonth(userId),
  ]);
  const p = PLANS[plan];
  return { dms, accounts, automations, aiReplies, limits: p };
}
