import { db } from "./db";
import type { ProductVars } from "./render";

type ProductRow = {
  title: string; url: string | null; description?: string; vendor?: string | null; productType?: string | null; tags?: string[]; options?: unknown; metafields?: unknown;
  variants: { title: string; price: string; compareAtPrice: string | null; inventoryQty: number | null; availableForSale: boolean; options?: unknown }[];
};

const arr = <T,>(v: unknown, ok: (x: unknown) => boolean): T[] => (Array.isArray(v) ? (v.filter(ok) as T[]) : []);
const isOpt = (x: unknown) => !!x && typeof (x as { name?: unknown }).name === "string" && Array.isArray((x as { values?: unknown }).values);
const isFact = (x: unknown) => !!x && typeof (x as { key?: unknown }).key === "string" && typeof (x as { value?: unknown }).value === "string";
const isVarOpt = (x: unknown) => !!x && typeof (x as { name?: unknown }).name === "string" && typeof (x as { value?: unknown }).value === "string";

export function toProductVars(p: ProductRow, currency: string | null): ProductVars {
  return {
    title: p.title,
    url: p.url,
    currency,
    description: p.description || null,
    vendor: p.vendor || null,
    productType: p.productType || null,
    tags: p.tags ?? [],
    options: arr<{ name: string; values: string[] }>(p.options, isOpt).filter((o) => !(o.name === "Title" && o.values.length === 1 && o.values[0] === "Default Title")),
    facts: arr<{ key: string; value: string }>(p.metafields, isFact),
    variants: p.variants.map((v) => ({ title: v.title, price: v.price, compareAtPrice: v.compareAtPrice, qty: v.inventoryQty, available: v.availableForSale && (v.inventoryQty === null || v.inventoryQty > 0), options: arr<{ name: string; value: string }>(v.options, isVarOpt) })),
  };
}

/** Linked products for every reel/post of a user, keyed by media id (used by the automation wizard preview). */
export async function loadUserMediaProducts(userId: string): Promise<{ byMedia: Record<string, ProductVars[]>; shopifyConnected: boolean }> {
  const [rows, stores] = await Promise.all([
    db.mediaProduct.findMany({
      where: { account: { userId }, product: { status: "ACTIVE" } },
      orderBy: { position: "asc" },
      include: { product: { include: { variants: true, store: { select: { currency: true } } } } },
    }),
    db.shopifyStore.count({ where: { userId, status: "connected" } }),
  ]);
  const byMedia: Record<string, ProductVars[]> = {};
  for (const r of rows) (byMedia[r.mediaId] ??= []).push({ ...toProductVars(r.product, r.product.store.currency), description: undefined, facts: undefined, tags: undefined, vendor: undefined, productType: undefined });
  return { byMedia, shopifyConnected: stores > 0 };
}

/** Products linked to a reel/post, in the order the user set. Only ACTIVE products are ever mentioned to customers. */
export async function loadProductVars(accountId: string, mediaId: string | null): Promise<ProductVars[]> {
  if (!mediaId) return [];
  const rows = await db.mediaProduct.findMany({
    where: { accountId, mediaId, product: { status: "ACTIVE" } },
    orderBy: { position: "asc" },
    include: { product: { include: { variants: true, store: { select: { currency: true } } } } },
  });
  return rows.map((r) => toProductVars(r.product, r.product.store.currency));
}

/** Store-wide knowledge the owner wrote once (delivery, COD, returns, size guide): shared by every AI agent on the account. */
export async function loadStoreNotes(userId: string): Promise<string> {
  const stores = await db.shopifyStore.findMany({ where: { userId, status: "connected", notes: { not: null } }, select: { notes: true } });
  return stores.map((s) => s.notes?.trim()).filter(Boolean).join("\n");
}

export const joinNotes = (...parts: (string | null | undefined)[]) => parts.map((p) => p?.trim()).filter(Boolean).join("\n");
