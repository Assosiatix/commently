import { after, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItemGid, productGid, syncOneProduct, verifyWebhookHmac } from "@/lib/shopify";

export const maxDuration = 60;

// One endpoint for product/inventory/uninstall events and Shopify's mandatory privacy webhooks.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookHmac(raw, req.headers.get("x-shopify-hmac-sha256"), process.env.SHOPIFY_API_SECRET ?? "")) return new Response("Invalid signature", { status: 401 });
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = (req.headers.get("x-shopify-shop-domain") ?? "").toLowerCase();
  let body: Record<string, any> = {};
  try { body = JSON.parse(raw); } catch { /* some topics have empty bodies */ }

  after(async () => {
    try {
      if (topic === "shop/redact") { await db.shopifyStore.deleteMany({ where: { shopDomain: shop } }); return; }
      // customers/data_request and customers/redact: we never store Shopify customer data, so there is nothing to export or erase.
      const store = await db.shopifyStore.findUnique({ where: { shopDomain: shop } });
      if (!store) return;
      if (topic === "app/uninstalled") {
        await db.shopifyStore.update({ where: { id: store.id }, data: { status: "disconnected", accessTokenEnc: "", refreshTokenEnc: null, tokenExpiresAt: null, webhooksOk: false } });
      } else if (topic === "products/create" || topic === "products/update") {
        if (body.id) await syncOneProduct(store.id, productGid(body.id));
      } else if (topic === "products/delete") {
        if (body.id) await db.product.deleteMany({ where: { storeId: store.id, shopifyId: productGid(body.id) } });
      } else if (topic === "inventory_levels/update") {
        if (body.inventory_item_id) {
          const v = await db.variant.findFirst({ where: { inventoryItemId: inventoryItemGid(body.inventory_item_id), product: { storeId: store.id } }, include: { product: { select: { shopifyId: true } } } });
          if (v) await syncOneProduct(store.id, v.product.shopifyId);
        }
      }
    } catch (e) {
      console.error("[shopify-webhook]", topic, e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ received: true });
}
