import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseSignedRequest } from "@/lib/crypto";

// Meta "Data Deletion Request" callback. Deletes the connected account (tokens, automations, logs).
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const data = parseSignedRequest(String(form?.get("signed_request") ?? ""), process.env.INSTAGRAM_APP_SECRET ?? "");
  if (!data) return new Response("Invalid signed_request", { status: 400 });
  const uid = String(data.user_id ?? "");
  if (uid) await db.igAccount.deleteMany({ where: { OR: [{ appScopedId: uid }, { igUserId: uid }] } });
  const code = randomBytes(8).toString("hex");
  return NextResponse.json({ url: `${process.env.APP_URL}/data-deletion?code=${code}`, confirmation_code: code });
}
