import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import CatalogView, { type CatalogProduct } from "@/components/shopify/CatalogView";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { toProductVars } from "@/lib/catalog";
import { db } from "@/lib/db";
import { priceText, stockText } from "@/lib/render";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Catalog" };

export default async function Catalog() {
  const user = await requireUser();
  const [stores, accounts, rows] = await Promise.all([
    db.shopifyStore.findMany({ where: { userId: user.id, status: "connected" }, select: { id: true } }),
    db.igAccount.findMany({ where: { userId: user.id }, select: { id: true, username: true } }),
    db.mediaProduct.findMany({ where: { account: { userId: user.id } }, orderBy: { position: "asc" }, select: { accountId: true, mediaId: true, productId: true } }),
  ]);
  if (!stores.length) {
    return (
      <>
        <PageHeader title="Catalog" description="Your Shopify products and the reels that promote them." />
        <EmptyState icon={ShoppingBag} title="Connect your Shopify store" text="Once connected, your products appear here and you can assign them to reels."><Button asChild><Link href="/dashboard/shopify">Connect Shopify</Link></Button></EmptyState>
      </>
    );
  }
  const products = await db.product.findMany({ where: { store: { userId: user.id, status: "connected" }, status: "ACTIVE" }, include: { variants: true, store: { select: { currency: true, shopName: true, shopDomain: true } } }, orderBy: { title: "asc" }, take: 500 });
  const items: CatalogProduct[] = products.map((p) => {
    const v = toProductVars(p, p.store.currency);
    return { id: p.id, title: p.title, imageUrl: p.imageUrl, price: priceText(v), stock: stockText(v), inStock: stockText(v) !== "Out of stock", variants: p.variants.length, store: p.store.shopName ?? p.store.shopDomain };
  });
  const links: Record<string, Record<string, string[]>> = {};
  for (const r of rows) ((links[r.accountId] ??= {})[r.mediaId] ??= []).push(r.productId);

  return (
    <>
      <PageHeader title="Catalog" description="Tell us which products each reel is about, so replies can quote the real price, sizes and stock.">
        <Button asChild variant="outline"><Link href="/dashboard/shopify">Store settings</Link></Button>
      </PageHeader>
      <CatalogView products={items} accounts={accounts} initialLinks={links} />
    </>
  );
}
