import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseSignedRequest } from "@/lib/crypto";

// Meta calls this when a user removes the app from their Instagram settings.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const signed = String(form?.get("signed_request") ?? "");
  const data = parseSignedRequest(signed, process.env.INSTAGRAM_APP_SECRET ?? "");
  if (!data) return new Response("Invalid signed_request", { status: 400 });
  const uid = String(data.user_id ?? "");
  if (uid) await db.igAccount.updateMany({ where: { OR: [{ appScopedId: uid }, { igUserId: uid }] }, data: { status: "revoked" } });
  return NextResponse.json({ ok: true });
}
