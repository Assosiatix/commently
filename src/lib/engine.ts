import type { Automation, Conversation, IgAccount } from "@/generated/prisma/client";
import { db } from "./db";
import { decrypt } from "./crypto";
import { getFollowStatus, replyToComment, sendDm } from "./instagram";
import { asButtons } from "./automation-data";
import { joinNotes, loadProductVars, loadStoreNotes } from "./catalog";
import { renderTemplate } from "./render";

export { renderTemplate };
import { aiConfigured } from "./ai";
import { answerComment } from "./ai-reply";
import { recordLead } from "./leads";
import { aiRepliesUsedThisMonth, dmsUsedThisMonth, PLANS } from "./plans";

export type CommentValue = {
  id?: string;
  text?: string;
  parent_id?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string; media_product_type?: string };
};

type Rule = { matchType: "CONTAINS" | "EXACT" | "ANY"; keywords: string[] };

const norm = (s: string) => s.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();

export function matchComment(rule: Rule, text: string): boolean {
  if (rule.matchType === "ANY") return true;
  const t = norm(text);
  if (!t) return false;
  const kws = rule.keywords.map(norm).filter(Boolean);
  if (rule.matchType === "EXACT") return kws.some((k) => t === k);
  return kws.some((k) => t.includes(k));
}

export function pickReply(list: string[]): string | null {
  const l = list.map((s) => s.trim()).filter(Boolean);
  return l.length ? l[Math.floor(Math.random() * l.length)] : null;
}

export type HandleResult =
  | { status: "ignored"; reason: string }
  | { status: "duplicate" }
  | { status: "SENT" | "PARTIAL" | "SKIPPED" | "FAILED"; automationId: string; error?: string };

/** At least two letters/digits once @mentions and emoji are stripped: otherwise there is no question to answer. */
export const hasWords = (s: string) => s.replace(/@[\w.]+/g, "").replace(/[^\p{L}\p{N}]/gu, "").length >= 2;

const MAX_AGENT_TURNS = 30;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 500);
const isUnique = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

/** Core: one `comments` webhook change -> at most one automation fires (Meta allows one private reply per comment). */
export async function handleComment(igUserId: string, v: CommentValue): Promise<HandleResult> {
  if (!v.id || !v.from?.id) return { status: "ignored", reason: "missing ids" };

  const account = await db.igAccount.findUnique({ where: { igUserId } });
  if (!account || account.status !== "active") return { status: "ignored", reason: "unknown or inactive account" };

  // Loop guard: our own public replies come back as comment webhooks.
  if (v.from.id === account.igUserId || (account.appScopedId && v.from.id === account.appScopedId)) {
    return { status: "ignored", reason: "own comment" };
  }
  if (v.parent_id) return { status: "ignored", reason: "reply to a comment (only top-level comments trigger)" };

  const mediaId = v.media?.id ?? null;
  const automations = await db.automation.findMany({
    where: { accountId: account.id, enabled: true, OR: [{ mediaId: null }, ...(mediaId ? [{ mediaId }] : [])] },
    orderBy: { createdAt: "asc" },
  });
  const text = v.text ?? "";
  // A keyword reward wins over the agent on the same post; the agent answers everything else.
  const rank = (a: { type: string }) => (a.type === "REWARD" ? 0 : 1);
  const auto = [...automations].sort((x, y) => rank(x) - rank(y) || x.createdAt.getTime() - y.createdAt.getTime()).find((a) => matchComment(a, text));
  if (!auto) return { status: "ignored", reason: "no matching automation" };
  if (auto.type === "AGENT" && !hasWords(text)) return { status: "ignored", reason: "no text to answer (emoji or tag only)" };

  // Idempotency: the unique (automationId, commentId) row is the lock.
  let logId: string;
  try {
    const log = await db.eventLog.create({
      data: {
        automationId: auto.id,
        accountId: account.id,
        commentId: v.id,
        mediaId,
        fromIgId: v.from.id,
        fromUsername: v.from.username ?? null,
        commentText: text.slice(0, 500),
        status: "PENDING",
      },
    });
    logId = log.id;
  } catch (e) {
    if (isUnique(e)) return { status: "duplicate" };
    throw e;
  }
  let aiMeta: Record<string, unknown> | undefined;
  const finish = async (status: "SENT" | "PARTIAL" | "SKIPPED" | "FAILED", error?: string): Promise<HandleResult> => {
    await db.eventLog.update({ where: { id: logId }, data: { status, error: error ?? null, ...(aiMeta ? { aiMeta: aiMeta as object } : {}) } });
    return { status, automationId: auto.id, error };
  };

  if (auto.oncePerUser) {
    const prev = await db.eventLog.count({
      where: { automationId: auto.id, fromIgId: v.from.id, status: { in: ["SENT", "PARTIAL"] }, id: { not: logId } },
    });
    if (prev > 0) return finish("SKIPPED", "user already received this automation");
  }

  // Plan quota: stop sending once the month's DM allowance is used up.
  const owner = await db.user.findUnique({ where: { id: account.userId }, select: { plan: true } });
  const plan = PLANS[owner?.plan ?? "FREE"];
  if (Number.isFinite(plan.dms) && (await dmsUsedThisMonth(account.userId)) >= plan.dms) {
    return finish("SKIPPED", `monthly DM limit reached (${plan.dms} a month, resets on the 1st)`);
  }

  if (account.tokenExpiresAt.getTime() < Date.now()) {
    await db.igAccount.update({ where: { id: account.id }, data: { status: "expired" } });
    return finish("FAILED", "access token expired, reconnect the account");
  }

  let token: string;
  try {
    token = decrypt(account.accessTokenEnc);
  } catch (e) {
    return finish("FAILED", `token decrypt failed: ${errMsg(e)}`);
  }

  const products = await loadProductVars(account.id, mediaId);
  const vars = { username: v.from.username, products };
  // First DM: a REWARD sends the written template; an AGENT answers this person's actual question (the template is its fallback).
  let dmText = renderTemplate(auto.dmText, vars);
  let aiButtons: { title: string; url: string }[] = [];
  let leadIntent: string | null = null;
  let needsAttention = false;
  let askedAbout = products.map((p) => p.title);
  let aiUsed = false;
  if (auto.type === "AGENT") {
    const aiCap = plan.aiReplies;
    if (!aiConfigured()) aiMeta = { used: false, reason: "AI is not configured on the server" };
    else if (Number.isFinite(aiCap) && (await aiRepliesUsedThisMonth(account.userId)) >= aiCap) aiMeta = { used: false, reason: `monthly AI limit reached (${aiCap} a month, resets on the 1st)` };
    else {
      const r = await answerComment({ comment: text, products, instructions: joinNotes(await loadStoreNotes(account.userId), auto.aiInstructions), brand: account.username });
      leadIntent = r.intent ?? null;
      if (r.usable && r.intent === "not_question") {
        aiMeta = { used: false, reason: "not a question", intent: r.intent, confidence: r.confidence };
        if (auto.questionsOnly) return finish("SKIPPED", "not a question");
      } else if (r.usable) {
        aiUsed = true;
        dmText = r.answer;
        needsAttention = r.needsHuman || r.missingInfo; // a partial answer still leaves something for a human to confirm
        aiMeta = { used: true, intent: r.intent, confidence: r.confidence, productIndex: r.productIndex, needsHuman: r.needsHuman, missingInfo: r.missingInfo };
        const target = r.productIndex >= 0 ? [products[r.productIndex]] : products;
        if (r.productIndex >= 0) askedAbout = [products[r.productIndex].title];
        if (auto.productButtons) aiButtons = target.filter((p) => p.url).map((p) => ({ title: `Buy ${p.title}`, url: p.url! }));
      } else {
        aiMeta = { used: false, reason: r.reason, intent: r.intent, confidence: r.confidence };
        // Complaints and "not sure" cases get flagged for a human; a complaint never receives the sales template.
        needsAttention = r.needsHuman === true || r.intent === "complaint" || /low confidence|not in your data/.test(r.reason);
        if (r.needsHuman || r.intent === "complaint") dmText = "Thanks for reaching out! Our team will get back to you shortly.";
      }
    }
  }

  let recipientId = v.from.id;
  try {
    const sent = await sendDm(account.igUserId, token, { comment_id: v.id }, {
      text: dmText,
      buttons: [...asButtons(auto.dmButtons), ...aiButtons].slice(0, 3),
      quickReplies: auto.dmQuickReply ? [auto.dmQuickReply] : [],
    });
    recipientId = sent?.recipient_id || recipientId;
  } catch (e) {
    return finish("FAILED", `DM failed: ${errMsg(e)}`);
  }

  // Track the thread so a reply from this person can trigger the follow-up and count in reply-rate stats.
  await db.conversation
    .create({
      data: { accountId: account.id, automationId: auto.id, commentId: v.id, igsid: recipientId, username: v.from.username ?? null, commentText: text.slice(0, 500), mediaId },
    })
    .catch((e) => {
      if (!isUnique(e)) console.error("[engine] conversation create failed", errMsg(e));
    });

  if (aiUsed) await db.aiUsage.create({ data: { userId: account.userId, accountId: account.id, source: "comment" } }).catch((e) => console.error("[engine] usage failed", errMsg(e)));
  await recordLead({ accountId: account.id, igsid: recipientId, username: v.from.username, comment: text, intent: leadIntent, products: askedAbout, needsAttention }).catch((e) => console.error("[engine] lead failed", errMsg(e)));

  const reply = pickReply(auto.publicReplies);
  if (reply) {
    try {
      await replyToComment(token, v.id, renderTemplate(reply, vars));
    } catch (e) {
      return finish("PARTIAL", `DM sent, public reply failed: ${errMsg(e)}`);
    }
  }
  return finish("SENT");
}

export type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean };
};

/** AGENT: a person wrote in the DM thread, so answer it like a comment: from the linked products and the store notes only. */
async function handleAgentMessage(account: IgAccount, convo: Conversation & { automation: Automation }, m: MessagingEvent): Promise<HandleResult> {
  const auto = convo.automation;
  const text = (m.message?.text ?? "").trim();
  if (!text || !auto.enabled || !hasWords(text)) return { status: "ignored", reason: "nothing to answer" };
  if (convo.turns >= MAX_AGENT_TURNS) return { status: "ignored", reason: "thread reached its answer limit" };

  // Duplicate-delivery guard: only the first of identical deliveries of this message moves lastMid.
  const mid = m.message?.mid ?? `${m.timestamp ?? ""}:${text.slice(0, 40)}`;
  const claimed = await db.conversation.updateMany({
    where: { id: convo.id, OR: [{ lastMid: null }, { lastMid: { not: mid } }] },
    data: { lastMid: mid, status: "REPLIED", repliedAt: convo.repliedAt ?? new Date(), turns: { increment: 1 } },
  });
  if (!claimed.count) return { status: "duplicate" };

  const owner = await db.user.findUnique({ where: { id: account.userId }, select: { plan: true } });
  const plan = PLANS[owner?.plan ?? "FREE"];
  if (Number.isFinite(plan.dms) && (await dmsUsedThisMonth(account.userId)) >= plan.dms) return { status: "SKIPPED", automationId: auto.id, error: "monthly DM limit reached" };
  let token: string;
  try {
    token = decrypt(account.accessTokenEnc);
  } catch (e) {
    return { status: "FAILED", automationId: auto.id, error: `token decrypt failed: ${errMsg(e)}` };
  }

  const products = await loadProductVars(account.id, convo.mediaId);
  let reply = renderTemplate(auto.dmText, { username: convo.username, products });
  let buttons: { title: string; url: string }[] = [];
  let intent: string | null = null;
  let flag = false;
  let usedAi = false;

  const aiCap = plan.aiReplies;
  if (aiConfigured() && !(Number.isFinite(aiCap) && (await aiRepliesUsedThisMonth(account.userId)) >= aiCap)) {
    const r = await answerComment({ comment: text, products, instructions: joinNotes(await loadStoreNotes(account.userId), auto.aiInstructions), brand: account.username, earlier: convo.commentText });
    intent = r.intent ?? null;
    if (r.usable && r.intent === "not_question") return { status: "SKIPPED", automationId: auto.id }; // "thanks", "ok": no need to answer
    if (r.usable) {
      usedAi = true;
      reply = r.answer;
      flag = r.needsHuman || r.missingInfo;
      if (auto.productButtons) {
        const target = r.productIndex >= 0 ? [products[r.productIndex]] : products;
        buttons = target.filter((p) => p.url).map((p) => ({ title: `Buy ${p.title}`, url: p.url! }));
      }
    } else {
      flag = r.needsHuman === true || r.intent === "complaint" || /low confidence|not in your data/.test(r.reason);
      if (r.needsHuman || r.intent === "complaint") reply = "Thanks for reaching out! Our team will get back to you shortly.";
    }
  }

  try {
    await sendDm(account.igUserId, token, { id: m.sender!.id! }, { text: reply, buttons: [...asButtons(auto.dmButtons), ...buttons].slice(0, 3) });
  } catch (e) {
    return { status: "FAILED", automationId: auto.id, error: `agent reply failed: ${errMsg(e)}` };
  }
  await db.aiUsage.create({ data: { userId: account.userId, accountId: account.id, source: usedAi ? "message" : "message_fallback" } }).catch((e) => console.error("[engine] usage failed", errMsg(e)));
  await db.lead
    .updateMany({ where: { accountId: account.id, igsid: m.sender!.id! }, data: { lastSeenAt: new Date(), lastComment: text.slice(0, 300), ...(intent ? { lastIntent: intent } : {}), ...(flag ? { needsAttention: true } : {}) } })
    .catch((e) => console.error("[engine] lead failed", errMsg(e)));
  return { status: "SENT", automationId: auto.id };
}

/**
 * A person messaged the account. If it answers one of our first DMs, mark the thread replied and send the
 * follow-up once. (Instagram only allows a second automated message after the person has replied.)
 */
export async function handleMessage(igUserId: string, m: MessagingEvent): Promise<HandleResult> {
  const senderId = m.sender?.id;
  if (!senderId || !m.message || m.message.is_echo || senderId === igUserId) return { status: "ignored", reason: "not an inbound message" };

  const account = await db.igAccount.findUnique({ where: { igUserId } });
  if (!account || account.status !== "active") return { status: "ignored", reason: "unknown or inactive account" };

  // Newest open thread from this person: waiting for a first reply, or waiting for them to follow.
  const convo = await db.conversation.findFirst({
    where: { accountId: account.id, igsid: senderId, automation: { type: "REWARD" }, status: { in: ["OPENER_SENT", "FOLLOW_REQUIRED"] } },
    orderBy: { openerAt: "desc" },
    include: { automation: true },
  });
  // An AI agent keeps answering in the DM thread (for 7 days after its first answer). If both kinds are open, the newest one gets the message.
  const agentConvo = await db.conversation.findFirst({
    where: { accountId: account.id, igsid: senderId, automation: { type: "AGENT" }, openerAt: { gte: new Date(Date.now() - 7 * 864e5) } },
    orderBy: { openerAt: "desc" },
    include: { automation: true },
  });
  if (agentConvo && (!convo || agentConvo.openerAt > convo.openerAt)) return handleAgentMessage(account, agentConvo, m);
  if (!convo) return { status: "ignored", reason: "no open conversation" };

  // Optimistic lock: updatedAt changes on success, so a duplicate delivery of the same message matches zero rows.
  const claimed = await db.conversation.updateMany({ where: { id: convo.id, updatedAt: convo.updatedAt }, data: { repliedAt: convo.repliedAt ?? new Date() } });
  if (!claimed.count) return { status: "duplicate" };

  const auto = convo.automation;
  const finalText = auto.followUpText?.trim();
  const setStatus = (status: "REPLIED" | "FOLLOW_REQUIRED" | "FOLLOWUP_SENT" | "FOLLOWUP_FAILED", error: string | null = null) =>
    db.conversation.update({ where: { id: convo.id }, data: { status, error, ...(status === "FOLLOWUP_SENT" && { followUpAt: new Date() }) } });
  const fail = async (error: string): Promise<HandleResult> => {
    await setStatus("FOLLOWUP_FAILED", error);
    return { status: "FAILED", automationId: auto.id, error };
  };

  if (!auto.enabled || (!finalText && !auto.requireFollow)) {
    await setStatus("REPLIED");
    return { status: "SKIPPED", automationId: auto.id };
  }

  const owner = await db.user.findUnique({ where: { id: account.userId }, select: { plan: true } });
  const plan = PLANS[owner?.plan ?? "FREE"];
  if (!plan.followUps) return fail("follow-ups are not available on this account");
  if (Number.isFinite(plan.dms) && (await dmsUsedThisMonth(account.userId)) >= plan.dms) return fail("monthly DM limit reached");

  let token: string;
  try {
    token = decrypt(account.accessTokenEnc);
  } catch (e) {
    return fail(`token decrypt failed: ${errMsg(e)}`);
  }
  const vars = { username: convo.username, products: await loadProductVars(account.id, convo.mediaId) };

  // Follow gate: only people who follow the account get the real message.
  if (auto.requireFollow) {
    const follows = await getFollowStatus(token, senderId); // null (unknown) lets them through rather than trapping them
    if (follows === false) {
      const gate = auto.followGateText?.trim() || `Looks like you're not following @${account.username} yet. Follow us, then tap the button below and I'll send it right away!`;
      try {
        await sendDm(account.igUserId, token, { id: senderId }, { text: renderTemplate(gate, vars), quickReplies: [auto.followGateButton?.trim() || "I'm following"] });
      } catch (e) {
        return fail(`follow-gate message failed: ${errMsg(e)}`);
      }
      await setStatus("FOLLOW_REQUIRED");
      return { status: "SENT", automationId: auto.id };
    }
  }

  if (!finalText) {
    await setStatus("REPLIED");
    return { status: "SKIPPED", automationId: auto.id };
  }
  try {
    const productButtons = auto.productButtons ? vars.products.filter((p) => p.url).map((p) => ({ title: `Buy ${p.title}`, url: p.url! })) : [];
    await sendDm(account.igUserId, token, { id: senderId }, { text: renderTemplate(finalText, vars), buttons: [...asButtons(auto.followUpButtons), ...productButtons].slice(0, 3) });
  } catch (e) {
    return fail(`follow-up failed: ${errMsg(e)}`);
  }
  await setStatus("FOLLOWUP_SENT");
  return { status: "SENT", automationId: auto.id };
}

type Change = { field?: string; value?: CommentValue };
type Entry = { id?: string; changes?: Change[]; messaging?: MessagingEvent[] };
export type WebhookPayload = { object?: string; entry?: Entry[] };

/** Handles a full webhook POST body. Never throws for one bad event; failures go to `onError`. */
export async function processWebhookPayload(payload: WebhookPayload, onError?: (e: unknown) => void) {
  if (payload?.object !== "instagram") return [];
  const out: HandleResult[] = [];
  for (const entry of payload.entry ?? []) {
    if (!entry.id) continue;
    for (const ch of entry.changes ?? []) {
      if (ch.field !== "comments" || !ch.value) continue;
      try {
        out.push(await handleComment(entry.id, ch.value));
      } catch (e) {
        console.error("[webhook] handleComment failed", errMsg(e));
        onError?.(e);
      }
    }
    for (const m of entry.messaging ?? []) {
      try {
        out.push(await handleMessage(entry.id, m));
      } catch (e) {
        console.error("[webhook] handleMessage failed", errMsg(e));
        onError?.(e);
      }
    }
  }
  return out;
}
