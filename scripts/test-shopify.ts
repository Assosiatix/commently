// Run: npx tsx scripts/test-shopify.ts
// Isolated: mocks Shopify + Instagram, creates and deletes only its own rows (email qa-shop-*@test.invalid).
import "dotenv/config";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.SHOPIFY_API_KEY = "key";
process.env.SHOPIFY_API_SECRET = "shpss_secret";
process.env.APP_URL = "https://example.test";

const product = (n: number, over: Record<string, unknown> = {}) => ({
  id: `gid://shopify/Product/${n}`, title: `Shirt ${n}`, handle: `shirt-${n}`, description: "Nice", vendor: "Acme", productType: "Tops", tags: ["new"], status: "ACTIVE",
  onlineStoreUrl: `https://shop.test/products/shirt-${n}`, totalInventory: 11, featuredImage: { url: `https://cdn.test/${n}.jpg` }, options: [{ name: "Size", values: ["S", "M"] }],
  variants: { nodes: [
    { id: `gid://shopify/ProductVariant/${n}1`, title: "S", sku: "S1", price: "2499.00", compareAtPrice: "2999.00", inventoryQuantity: 8, availableForSale: true, selectedOptions: [{ name: "Size", value: "S" }], image: null, inventoryItem: { id: `gid://shopify/InventoryItem/${n}1` } },
    { id: `gid://shopify/ProductVariant/${n}2`, title: "M", sku: "M1", price: "2799.00", compareAtPrice: null, inventoryQuantity: 0, availableForSale: false, selectedOptions: [{ name: "Size", value: "M" }], image: null, inventoryItem: { id: `gid://shopify/InventoryItem/${n}2` } },
  ] },
  ...over,
});

async function main() {
  const { db } = await import("../src/lib/db");
  const { encrypt, decrypt: decryptForTest } = await import("../src/lib/crypto");
  const S = await import("../src/lib/shopify");
  const R = await import("../src/lib/render");
  const { handleComment } = await import("../src/lib/engine");

  // ---- pure helpers
  assert.equal(S.normalizeShop("My-Store"), "my-store.myshopify.com");
  assert.equal(S.normalizeShop("https://my-store.myshopify.com/admin/products"), "my-store.myshopify.com");
  assert.equal(S.normalizeShop("admin.shopify.com/store/my-store/apps"), "my-store.myshopify.com");
  assert.equal(S.normalizeShop("evil.com"), null);
  assert.equal(S.normalizeShop("my-store.myshopify.com.evil.com"), null);
  assert.equal(S.normalizeShop("my store"), null);

  const p = new URLSearchParams({ code: "abc", shop: "a.myshopify.com", state: "xyz", timestamp: "1" });
  const msg = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("&");
  p.set("hmac", createHmac("sha256", "shpss_secret").update(msg).digest("hex"));
  assert.ok(S.verifyQueryHmac(p, "shpss_secret"), "valid oauth hmac");
  p.set("shop", "b.myshopify.com");
  assert.ok(!S.verifyQueryHmac(p, "shpss_secret"), "tampered param rejected");
  const body = '{"id":1}';
  const wh = createHmac("sha256", "shpss_secret").update(body).digest("base64");
  assert.ok(S.verifyWebhookHmac(body, wh, "shpss_secret"));
  assert.ok(!S.verifyWebhookHmac(body + " ", wh, "shpss_secret"));
  assert.ok(!S.verifyWebhookHmac(body, null, "shpss_secret"));

  // ---- templates
  const vars = { title: "Linen Shirt", url: "https://s.test/p", currency: "PKR", variants: [
    { title: "S", price: "2499", qty: 3, available: true }, { title: "M", price: "2799", qty: 0, available: false } ] };
  assert.match(R.priceText(vars), /PKR.2,499.*–.*PKR.2,799/);
  assert.equal(R.stockText(vars), "Only 3 left");
  assert.equal(R.stockText({ ...vars, variants: [{ title: "M", price: "1", qty: 0, available: false }] }), "Out of stock");
  assert.match(R.variantsText(vars), /S: PKR.2,499 \(in stock\)\nM: PKR.2,799 \(sold out\)/);
  assert.equal(R.renderTemplate("Hi {{username}} {{ Product.Title }} {{unknown}}", { username: "bob", products: [vars] }), "Hi @bob Linen Shirt {{unknown}}");
  assert.equal(R.renderTemplate("{{product.price}}", { username: "x" }), "", "no product -> empty, never a broken placeholder");

  // ---- sync against a mocked Shopify
  let catalogue = [product(1), product(2), product(3)];
  const calls: string[] = [];
  const sent: any[] = [];
  const tokenCalls: Record<string, string>[] = [];
  const gqlTokens: string[] = [];
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(input);
    if (url.endsWith("/admin/oauth/access_token")) {
      assert.equal(init.headers["Content-Type"], "application/x-www-form-urlencoded", "token requests are form-encoded");
      const b = Object.fromEntries(new URLSearchParams(init.body.toString()));
      tokenCalls.push(b);
      await new Promise((r) => setTimeout(r, 20));
      const n = tokenCalls.length;
      return Response.json({ access_token: `shpat_new${n}`, scope: "read_products,read_inventory", expires_in: 3600, refresh_token: `shprt_${n}`, refresh_token_expires_in: 7776000 });
    }
    if (url.includes("/graphql.json")) {
      gqlTokens.push(init.headers["X-Shopify-Access-Token"]);
      const { query, variables } = JSON.parse(init.body);
      calls.push(query.includes("products(first") ? `products:${variables.cursor ?? "start"}` : query.includes("node(id") ? "node" : "shop");
      if (query.includes("shop {")) return Response.json({ data: { shop: { name: "Acme Store", currencyCode: "PKR", primaryDomain: { url: "https://www.acme.test" } } } });
      if (query.includes("node(id")) return Response.json({ data: { node: catalogue.find((x) => x.id === variables.id) ?? null } });
      const start = variables.cursor ? Number(String(variables.cursor).slice(1)) : 0;
      const page = catalogue.slice(start, start + 2);
      const more = start + 2 < catalogue.length;
      return Response.json({ data: { products: { pageInfo: { hasNextPage: more, endCursor: more ? `c${start + 2}` : null }, nodes: page } } });
    }
    if (url.endsWith("/messages")) { sent.push(JSON.parse(init.body)); return Response.json({ recipient_id: "U9", message_id: "m" }); }
    return Response.json({});
  }) as typeof fetch;

  const email = `qa-shop-${Date.now()}@test.invalid`;
  const user = await db.user.create({ data: { email, passwordHash: "x" } });
  try {
    const store = await db.shopifyStore.create({ data: { userId: user.id, shopDomain: `qa-${Date.now()}.myshopify.com`, accessTokenEnc: encrypt("shpat_x"), scopes: "read_products,read_inventory" } });

    // ---- expiring tokens: install asks for one, an expired one is refreshed exactly once, even under concurrency
    const ex = await S.exchangeCode("a.myshopify.com", "the-code");
    assert.deepEqual(tokenCalls[0], { client_id: "key", client_secret: "shpss_secret", code: "the-code", expiring: "1" });
    assert.equal(ex.refresh_token, "shprt_1");
    tokenCalls.length = 0;
    const exp = await db.shopifyStore.create({ data: { userId: user.id, shopDomain: `qa-exp-${Date.now()}.myshopify.com`, accessTokenEnc: encrypt("shpat_old"), refreshTokenEnc: encrypt("shprt_old"), tokenExpiresAt: new Date(Date.now() - 1000), scopes: "read_products" } });
    const expRow = await db.shopifyStore.findUniqueOrThrow({ where: { id: exp.id } });
    await Promise.all([S.gql(expRow, "{ shop { name } }"), S.gql(expRow, "{ shop { name } }"), S.gql(expRow, "{ shop { name } }")]);
    assert.equal(tokenCalls.length, 1, "three parallel calls -> a single refresh");
    assert.deepEqual(tokenCalls[0], { client_id: "key", client_secret: "shpss_secret", grant_type: "refresh_token", refresh_token: "shprt_old" });
    assert.deepEqual(gqlTokens.slice(-3), ["shpat_new1", "shpat_new1", "shpat_new1"], "all calls used the refreshed token");
    const after = await db.shopifyStore.findUniqueOrThrow({ where: { id: exp.id } });
    assert.ok(after.tokenExpiresAt && after.tokenExpiresAt.getTime() > Date.now() + 3000_000);
    assert.equal(decryptForTest(after.refreshTokenEnc!), "shprt_1", "rotated refresh token stored");
    tokenCalls.length = 0;
    await S.gql(after, "{ shop { name } }");
    assert.equal(tokenCalls.length, 0, "fresh token is not refreshed again");

    const r1 = await S.syncStore(store.id);
    assert.ok(r1.ok && !r1.partial && r1.synced === 3, JSON.stringify(r1));
    assert.deepEqual(calls.filter((c) => c.startsWith("products")), ["products:start", "products:c2"], "paginates");
    let s = await db.shopifyStore.findUniqueOrThrow({ where: { id: store.id } });
    assert.equal(s.shopName, "Acme Store");
    assert.equal(s.currency, "PKR");
    assert.equal(s.syncStatus, "idle");
    assert.ok(s.lastSyncAt);
    assert.equal(await db.product.count({ where: { storeId: store.id } }), 3);
    assert.equal(await db.variant.count({ where: { product: { storeId: store.id } } }), 6);

    // sync is idempotent and removes products deleted in Shopify
    await new Promise((r) => setTimeout(r, 15));
    catalogue = [product(1, { title: "Shirt 1 (renamed)" }), product(3)];
    await S.syncStore(store.id);
    assert.equal(await db.product.count({ where: { storeId: store.id } }), 2);
    assert.equal((await db.product.findFirstOrThrow({ where: { storeId: store.id, shopifyId: "gid://shopify/Product/1" } })).title, "Shirt 1 (renamed)");

    // a time-boxed sync resumes where it stopped
    catalogue = [product(1), product(2), product(3), product(4), product(5)];
    const part = await S.syncStore(store.id, -1);
    assert.ok(part.ok && part.partial, "budget exhausted -> partial");
    s = await db.shopifyStore.findUniqueOrThrow({ where: { id: store.id } });
    assert.equal(s.syncStatus, "partial");
    assert.ok(s.syncCursor);
    const rest = await S.syncStore(store.id);
    assert.ok(rest.ok && !rest.partial);
    assert.equal(await db.product.count({ where: { storeId: store.id } }), 5);

    // webhook-style single refresh: price change + delete
    catalogue = catalogue.map((x) => (x.id.endsWith("/2") ? product(2, { title: "Shirt 2 NEW" }) : x));
    await S.syncOneProduct(store.id, "gid://shopify/Product/2");
    assert.equal((await db.product.findFirstOrThrow({ where: { storeId: store.id, shopifyId: "gid://shopify/Product/2" } })).title, "Shirt 2 NEW");
    catalogue = catalogue.filter((x) => !x.id.endsWith("/2"));
    await S.syncOneProduct(store.id, "gid://shopify/Product/2");
    assert.equal(await db.product.count({ where: { storeId: store.id, shopifyId: "gid://shopify/Product/2" } }), 0);

    // ---- reel -> several products -> real DM text
    const acc = await db.igAccount.create({ data: { userId: user.id, igUserId: `QA_IG_${Date.now()}`, username: "brand", accessTokenEnc: encrypt("TOKEN"), tokenExpiresAt: new Date(Date.now() + 864e5 * 30) } });
    const [p1, p3] = await Promise.all(["1", "3"].map((n) => db.product.findFirstOrThrow({ where: { storeId: store.id, shopifyId: `gid://shopify/Product/${n}` } })));
    await db.mediaProduct.createMany({ data: [{ accountId: acc.id, mediaId: "REEL1", productId: p1.id, position: 0 }, { accountId: acc.id, mediaId: "REEL1", productId: p3.id, position: 1 }] });
    await db.automation.create({ data: { userId: user.id, accountId: acc.id, name: "t", mediaId: "REEL1", matchType: "ANY", keywords: [], dmText: "{{product.title}}: {{product.price}} ({{product.stock}})\n{{product.variants}}\n{{products}}", publicReplies: [], oncePerUser: false } });
    const res = await handleComment(acc.igUserId, { id: "cm1", text: "price?", from: { id: "U9", username: "bob" }, media: { id: "REEL1" } });
    assert.equal(res.status, "SENT");
    const dm = sent.at(-1).message.text as string;
    assert.match(dm, /^Shirt 1: PKR.2,499 – PKR.2,799 \(In stock\)/);
    assert.match(dm, /S: PKR.2,499 \(in stock\)\nM: PKR.2,799 \(sold out\)/);
    assert.match(dm, /• Shirt 1: .*\n• Shirt 3: /);
    assert.equal((await db.conversation.findFirstOrThrow({ where: { commentId: "cm1" } })).mediaId, "REEL1");

    // a different reel has no products -> variables render empty, not as raw {{...}}
    await db.automation.create({ data: { userId: user.id, accountId: acc.id, name: "t2", mediaId: "REEL2", matchType: "ANY", keywords: [], dmText: "Hi [{{product.price}}]", publicReplies: [], oncePerUser: false } });
    await handleComment(acc.igUserId, { id: "cm2", text: "x", from: { id: "U8", username: "al" }, media: { id: "REEL2" } });
    assert.equal(sent.at(-1).message.text, "Hi []");

    // uninstalled product (draft) is never quoted
    await db.product.update({ where: { id: p1.id }, data: { status: "DRAFT" } });
    await db.automation.updateMany({ where: { mediaId: "REEL1" }, data: { dmText: "{{product.title}}" } });
    await handleComment(acc.igUserId, { id: "cm3", text: "x", from: { id: "U7", username: "cy" }, media: { id: "REEL1" } });
    assert.equal(sent.at(-1).message.text, "Shirt 3", "draft product skipped, next product used");

    console.log("shopify tests: all passed");
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
