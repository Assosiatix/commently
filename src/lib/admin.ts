import { notFound } from "next/navigation";
import { requireUser } from "./session";

/** Technical screens (webhook deliveries, redirect URLs, Meta/Shopify setup values) are for the people running the platform, not for customers. */
export const isAdmin = (email: string) =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());

/** Someone who sells products (shows Shopify, Catalog and product answers). Content creators never see store features. */
export const isMerchant = (goal: string | null | undefined, shopifyConnected: boolean) => goal === "sales" || shopifyConnected;

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.email)) notFound();
  return user;
}
