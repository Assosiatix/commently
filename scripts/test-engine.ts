// Run: DATABASE_URL=... npm run test:engine   (uses a mocked Graph API, no network)
import "dotenv/config";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";

process.env.APP_URL ||= "https://example.test";
process.env.AUTH_SECRET ||= randomBytes(32).toString("hex");
process.env.ENCRYPTION_KEY ||= randomBytes(32).toString("hex");
process.env.INSTAGRAM_APP_ID ||= "123";
process.env.INSTAGRAM_APP_SECRET ||= "secret";

async function main() {
  const { db } = await import("../src/lib/db");
  const { encrypt, decrypt, verifyMetaSignature } = await import("../src/lib/crypto");
  const { handleComment, processWebhookPayload, matchComment, renderTemplate } = await import("../src/lib/engine");

  const calls: { url: string; body: any; auth: string | null }[] = [];
  let failDm = false;
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(input);
    let body: any = null;
    if (typeof init.body === "string") body = init.body.startsWith("{") ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body));
    else if (init.body instanceof URLSearchParams) body = Object.fromEntries(init.body);
    calls.push({ url, body, auth: new Headers(init.headers).get("authorization") });
    if (url.endsWith("/messages") && failDm) return new Response(JSON.stringify({ error: { message: "boom", code: 100 } }), { status: 400 });
    return new Response(JSON.stringify({ id: "x" }), { status: 200 });
  }) as typeof fetch;

  await db.user.deleteMany();
  const user = await db.user.create({ data: { email: "t@t.test", passwordHash: "x" } });
  const acc = await db.igAccount.create({
    data: { userId: user.id, igUserId: "IG1", username: "me", accessTokenEnc: encrypt("TOKEN123"), tokenExpiresAt: new Date(Date.now() + 30 * 864e5), scopes: "instagram_business_basic" },
  });
  const auto = await db.automation.create({
    data: { userId: user.id, accountId: acc.id, name: "t", matchType: "CONTAINS", keywords: ["guide"], dmText: "Hi {{username}}!", publicReplies: ["Check DMs"], oncePerUser: true },
  });

  const comment = (id: string, text: string, from = "U1", extra: object = {}) => ({ id, text, from: { id: from, username: "bob" }, media: { id: "M1" }, ...extra });
  let n = 0;

  // pure helpers
  assert.equal(matchComment({ matchType: "CONTAINS", keywords: ["Guide"] }, "send me the GUIDE pls"), true); n++;
  assert.equal(matchComment({ matchType: "EXACT", keywords: ["guide"] }, "guide!"), false); n++;
  assert.equal(renderTemplate("Hi {{username}}", { username: "bob" }), "Hi @bob"); n++;
  assert.equal(decrypt(encrypt("abc")), "abc"); n++;

  // 1. matching comment -> DM + public reply
  let r = await handleComment("IG1", comment("C1", "send the guide"));
  assert.equal(r.status, "SENT");
  const dm = calls.find((c) => c.url.endsWith("/IG1/messages"))!;
  assert.deepEqual(dm.body, { recipient: { comment_id: "C1" }, message: { text: "Hi @bob!" } });
  assert.equal(dm.auth, "Bearer TOKEN123");
  assert.ok(calls.some((c) => c.url.endsWith("/C1/replies") && c.body.message === "Check DMs")); n += 3;

  // 2. same comment delivered again -> deduped, nothing sent
  const before = calls.length;
  r = await handleComment("IG1", comment("C1", "send the guide"));
  assert.equal(r.status, "duplicate");
  assert.equal(calls.length, before); n++;

  // 3. same person, new comment -> oncePerUser skips
  r = await handleComment("IG1", comment("C2", "guide again"));
  assert.equal(r.status, "SKIPPED"); n++;

  // 4. own comment ignored (loop guard)
  r = await handleComment("IG1", comment("C3", "guide", "IG1"));
  assert.equal(r.status, "ignored"); n++;

  // 5. keyword mismatch ignored
  r = await handleComment("IG1", comment("C4", "nice pic", "U2"));
  assert.equal(r.status, "ignored"); n++;

  // 6. reply-to-comment ignored
  r = await handleComment("IG1", comment("C5", "guide", "U3", { parent_id: "C1" }));
  assert.equal(r.status, "ignored"); n++;

  // 7. DM failure -> FAILED and logged, no public reply
  failDm = true;
  const b2 = calls.length;
  r = await handleComment("IG1", comment("C6", "guide", "U4"));
  assert.equal(r.status, "FAILED");
  assert.ok(!calls.slice(b2).some((c) => c.url.endsWith("/replies")));
  failDm = false; n += 2;

  // 8. full webhook payload path
  await processWebhookPayload({ object: "instagram", entry: [{ id: "IG1", time: 1, changes: [{ field: "comments", value: comment("C7", "guide!", "U5") }] }] } as any);
  const log = await db.eventLog.findFirst({ where: { commentId: "C7" } });
  assert.equal(log?.status, "SENT"); n++;

  // 9. signature verification
  const body = '{"a":1}';
  const sig = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(verifyMetaSignature(body, sig, "secret"), true);
  assert.equal(verifyMetaSignature(body + " ", sig, "secret"), false);
  assert.equal(verifyMetaSignature(body, null, "secret"), false); n += 3;

  // 10. expired token -> not sent
  await db.igAccount.update({ where: { id: acc.id }, data: { tokenExpiresAt: new Date(Date.now() - 1000) } });
  const b3 = calls.length;
  r = await handleComment("IG1", comment("C8", "guide", "U6"));
  assert.notEqual(r.status, "SENT");
  assert.equal(calls.length, b3); n++;

  await db.user.deleteMany();
  console.log(`✔ all ${n} assertions passed`);
  await db.$disconnect();
}
main().catch((e) => { console.error("✘ FAILED:", e); process.exit(1); });
