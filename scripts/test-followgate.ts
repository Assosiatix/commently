// Run: npx tsx scripts/test-followgate.ts  — isolated: creates and deletes only its own rows (email qa-fg-*@test.invalid).
import "dotenv/config";
import assert from "node:assert/strict";

async function main() {
  const { db } = await import("../src/lib/db");
  const { encrypt } = await import("../src/lib/crypto");
  const { handleMessage } = await import("../src/lib/engine");

  let follows = false;
  let richFails = false;
  const sent: any[] = [];
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(input);
    if (init.method === "POST" && url.endsWith("/messages")) {
      const body = JSON.parse(init.body);
      if (richFails && body.message.attachment) return new Response(JSON.stringify({ error: { message: "template not allowed", code: 100 } }), { status: 400 });
      sent.push(body);
      return new Response(JSON.stringify({ recipient_id: "x", message_id: "m" }), { status: 200 });
    }
    if (url.includes("is_user_follow_business")) return new Response(JSON.stringify({ is_user_follow_business: follows, id: "S" }), { status: 200 });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  const email = `qa-fg-${Date.now()}@test.invalid`;
  const user = await db.user.create({ data: { email, passwordHash: "x" } });
  try {
    const acc = await db.igAccount.create({ data: { userId: user.id, igUserId: `QA_IG_${Date.now()}`, username: "brand", accessTokenEnc: encrypt("TOKEN"), tokenExpiresAt: new Date(Date.now() + 864e5 * 30) } });
    const auto = await db.automation.create({ data: { userId: user.id, accountId: acc.id, name: "t", keywords: [], matchType: "ANY", dmText: "hi", requireFollow: true, followUpText: "Here {{username}}", followUpButtons: [{ title: "Open", url: "https://x.test" }] } });
    const mkConvo = (igsid: string, commentId: string) => db.conversation.create({ data: { accountId: acc.id, automationId: auto.id, commentId, igsid, username: "maya" } });
    const msg = (igsid: string) => ({ sender: { id: igsid }, message: { mid: "m", text: "tap" } });

    // 1. not following -> gate message with chip, status FOLLOW_REQUIRED
    const c1 = await mkConvo("S1", "c1");
    let r = await handleMessage(acc.igUserId, msg("S1"));
    assert.equal(r.status, "SENT");
    assert.equal((await db.conversation.findUniqueOrThrow({ where: { id: c1.id } })).status, "FOLLOW_REQUIRED");
    assert.equal(sent.length, 1);
    assert.match(sent[0].message.text, /not following/i);
    assert.equal(sent[0].message.quick_replies[0].title, "I'm following");
    assert.deepEqual(sent[0].recipient, { id: "S1" });

    // 2. now following -> final message with link button template
    follows = true;
    r = await handleMessage(acc.igUserId, msg("S1"));
    assert.equal(r.status, "SENT");
    const done = await db.conversation.findUniqueOrThrow({ where: { id: c1.id } });
    assert.equal(done.status, "FOLLOWUP_SENT");
    assert.ok(done.followUpAt);
    assert.equal(sent.length, 2);
    assert.equal(sent[1].message.attachment.payload.template_type, "button");
    assert.equal(sent[1].message.attachment.payload.buttons[0].url, "https://x.test");
    assert.match(sent[1].message.attachment.payload.text, /Here @maya/);

    // 3. finished thread ignores further messages
    assert.equal((await handleMessage(acc.igUserId, msg("S1"))).status, "ignored");
    assert.equal(sent.length, 2);

    // 4. duplicate delivery of the same message sends exactly once
    await mkConvo("S2", "c2");
    sent.length = 0;
    await Promise.all([handleMessage(acc.igUserId, msg("S2")), handleMessage(acc.igUserId, msg("S2")), handleMessage(acc.igUserId, msg("S2"))]);
    assert.equal(sent.length, 1, `expected 1 send, got ${sent.length}`);

    // 5. Instagram rejects the button template -> falls back to links as text
    await mkConvo("S3", "c3");
    sent.length = 0;
    richFails = true;
    await handleMessage(acc.igUserId, msg("S3"));
    assert.equal(sent.length, 1);
    assert.match(sent[0].message.text, /Open: https:\/\/x\.test/);

    // 6. follow status unknown (API error) lets the person through instead of trapping them
    await mkConvo("S4", "c4");
    sent.length = 0;
    richFails = false;
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (i: any, init: any) => (String(i).includes("is_user_follow_business") ? new Response("{}", { status: 500 }) : realFetch(i, init))) as typeof fetch;
    await handleMessage(acc.igUserId, msg("S4"));
    assert.equal(sent.length, 1);
    assert.ok(sent[0].message.attachment, "final message sent when follow status unknown");
    console.log("follow-gate tests: all passed");
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
