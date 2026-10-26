import { after, NextResponse } from "next/server";
import { safeEqual, verifyMetaSignature } from "@/lib/crypto";
import type { WebhookPayload } from "@/lib/engine";
import { processStoredEvent, storeWebhookEvent } from "@/lib/webhook-inbox";

export const runtime = "nodejs";
export const maxDuration = 60;

// Meta webhook verification (GET) — Meta calls this once when you save the Callback URL in the App Dashboard.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const expected = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? "";
  if (p.get("hub.mode") === "subscribe" && expected && safeEqual(p.get("hub.verify_token") ?? "", expected)) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

// Event delivery (POST). Verify X-Hub-Signature-256 -> store -> ack fast -> process after the response.
// Meta expects a 200 within a few seconds, otherwise it retries and eventually disables the subscription.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), process.env.INSTAGRAM_APP_SECRET ?? "")) {
    return new Response("Invalid signature", { status: 401 });
  }
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  let eventId: string;
  try {
    eventId = (await storeWebhookEvent(payload)).id;
  } catch (e) {
    // Could not persist: tell Meta to retry rather than silently dropping the event.
    console.error("[webhook] store failed", e instanceof Error ? e.message : e);
    return new Response("Temporary error", { status: 500 });
  }

  after(async () => {
    try {
      await processStoredEvent(eventId);
    } catch (e) {
      console.error("[webhook] processing error", e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ received: true });
}
