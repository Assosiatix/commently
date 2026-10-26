import { db } from "./db";
import type { ProductVars } from "./render";

type ProductRow = { title: string; url: string | null; description?: string; variants: { title: string; price: string; compareAtPrice: string | null; inventoryQty: number | null; availableForSale: boolean }[] };

export function toProductVars(p: ProductRow, currency: string | null): ProductVars {
  return {
    title: p.title,
    url: p.url,
    currency,
    description: p.description || null,
    variants: p.variants.map((v) => ({ title: v.title, price: v.price, compareAtPrice: v.compareAtPrice, qty: v.inventoryQty, available: v.availableForSale && (v.inventoryQty === null || v.inventoryQty > 0) })),
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
  for (const r of rows) (byMedia[r.mediaId] ??= []).push({ ...toProductVars(r.product, r.product.store.currency), description: undefined });
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
