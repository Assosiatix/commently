import { Prisma } from "@/generated/prisma/client";
import type { z } from "zod";
import type { automationSchema } from "./validation";

type Input = z.infer<typeof automationSchema>;
const text = (s?: string | null) => s?.trim() || null;
const buttons = (b?: { title: string; url: string }[] | null) => (b && b.length ? b : Prisma.DbNull);

/** Maps validated form input to Automation columns (shared by create + update). */
export function toAutomationData(d: Input) {
  const agent = d.type === "AGENT";
  return {
    type: d.type ?? "REWARD",
    questionsOnly: d.questionsOnly ?? true,
    name: d.name,
    mediaId: d.mediaId || null,
    mediaPermalink: d.mediaId ? d.mediaPermalink ?? null : null,
    mediaThumbUrl: d.mediaId ? d.mediaThumbUrl ?? null : null,
    // An agent listens to every comment on its post and lets the AI decide which are questions.
    matchType: agent ? ("ANY" as const) : d.matchType,
    keywords: agent || d.matchType === "ANY" ? [] : d.keywords,
    dmText: d.dmText,
    dmButtons: buttons(d.dmButtons),
    dmQuickReply: agent ? null : text(d.dmQuickReply),
    publicReplies: d.publicReplies,
    oncePerUser: d.oncePerUser,
    requireFollow: agent ? false : d.requireFollow ?? false,
    productButtons: d.productButtons ?? false,
    aiInstructions: text(d.aiInstructions),
    followGateText: text(d.followGateText),
    followGateButton: text(d.followGateButton),
    followUpText: agent ? null : text(d.followUpText),
    followUpButtons: buttons(d.followUpButtons),
  };
}

/** Reads a stored Json column back into a typed button list. */
export function asButtons(v: unknown): { title: string; url: string }[] {
  if (!Array.isArray(v)) return [];
  return v.filter((b): b is { title: string; url: string } => !!b && typeof b.title === "string" && typeof b.url === "string").slice(0, 3);
}
