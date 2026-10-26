import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getSessionUserId } from "@/lib/session";
import { listMedia } from "@/lib/instagram";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accountId = new URL(req.url).searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
  const account = await db.igAccount.findFirst({ where: { id: accountId, userId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  try {
    return NextResponse.json({ media: await listMedia(decrypt(account.accessTokenEnc)) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load posts" }, { status: 502 });
  }
}
