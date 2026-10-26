// Static plan catalogue. No database imports so client components (pricing cards) can use it.
import type { Plan } from "@/generated/prisma/client";

export type PlanInfo = {
  id: Plan;
  name: string;
  price: number; // USD / month
  blurb: string;
  accounts: number;
  automations: number; // Infinity = unlimited
  dms: number; // DMs per calendar month (first DMs + follow-ups)
  aiReplies: number; // AI-written answers per calendar month
  followUps: boolean;
  features: string[];
};

// Prices are placeholders: change them here and the landing page, billing page and enforcement all follow.
export const PLANS: Record<Plan, PlanInfo> = {
  FREE: {
    id: "FREE", name: "Starter", price: 0, blurb: "Try it on one account.",
    accounts: 1, automations: 2, dms: 100, aiReplies: 30, followUps: true,
    features: ["1 Instagram account", "2 automations", "100 DMs / month", "30 AI answers / month", "Keyword + post triggers", "Follow-gate + follow-up messages", "Buttons, links and quick replies", "Activity log"],
  },
  PRO: {
    id: "PRO", name: "Creator", price: 19, blurb: "For creators and small shops.",
    accounts: 3, automations: Infinity, dms: 3000, aiReplies: 1500, followUps: true,
    features: ["3 Instagram accounts", "Unlimited automations", "3,000 DMs / month", "1,500 AI answers / month", "Follow-gate + follow-up messages", "Buttons, links and quick replies", "Conversation tracking"],
  },
  AGENCY: {
    id: "AGENCY", name: "Agency", price: 49, blurb: "Run it for many clients.",
    accounts: 10, automations: Infinity, dms: 20000, aiReplies: 10000, followUps: true,
    features: ["10 Instagram accounts", "Unlimited automations", "20,000 DMs / month", "10,000 AI answers / month", "Follow-gate + follow-up messages", "Buttons, links and quick replies", "Priority support"],
  },
};

export const PLAN_ORDER: Plan[] = ["FREE", "PRO", "AGENCY"];
export const unlimited = (n: number) => !Number.isFinite(n);

