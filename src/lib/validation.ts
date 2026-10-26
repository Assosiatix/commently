import { z } from "zod";

export const credsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  name: z.string().trim().max(80).optional(),
});

const button = z.object({
  title: z.string().trim().min(1, "Button needs a label").max(20, "Button label: 20 characters max"),
  url: z.string().trim().url("Button link must be a full URL like https://…").refine((u) => /^https?:\/\//i.test(u), "Button link must start with http:// or https://"),
});
const buttons = z.array(button).max(3, "Up to 3 buttons").nullable().optional();
const chip = z.string().trim().max(20, "Quick reply: 20 characters max").nullable().optional();

export const automationSchema = z
  .object({
    name: z.string().trim().min(1, "Give the automation a name").max(80),
    accountId: z.string().min(1, "Select an Instagram account"),
    mediaId: z.string().nullable().optional(),
    mediaPermalink: z.string().nullable().optional(),
    mediaThumbUrl: z.string().nullable().optional(),
    matchType: z.enum(["CONTAINS", "EXACT", "ANY"]),
    keywords: z.array(z.string().trim().min(1).max(60)).max(20),
    dmText: z.string().trim().min(1, "Write the DM message").max(1000),
    publicReplies: z.array(z.string().trim().min(1).max(300)).max(10),
    oncePerUser: z.boolean(),
    followUpText: z.string().trim().max(1000).nullable().optional(),
    followUpButtons: buttons,
    dmButtons: buttons,
    dmQuickReply: chip,
    requireFollow: z.boolean().optional(),
    productButtons: z.boolean().optional(),
    type: z.enum(["REWARD", "AGENT"]).optional(),
    questionsOnly: z.boolean().optional(),
    aiInstructions: z.string().trim().max(1500).nullable().optional(),
    followGateText: z.string().trim().max(1000).nullable().optional(),
    followGateButton: chip,
    enabled: z.boolean().optional(),
  })
  .refine((d) => d.matchType === "ANY" || d.keywords.length > 0, { message: "Add at least one keyword", path: ["keywords"] });

export const profileSchema = z.object({
  name: z.string().trim().max(80).optional(),
  goal: z.enum(["sales", "followers", "leads", "support"]).optional(),
  onboarded: z.boolean().optional(),
});

export const automationPatchSchema = z.object({ enabled: z.boolean() });

export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Invalid input";
