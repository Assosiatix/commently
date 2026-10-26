import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, aiModel } from "@/lib/ai";
import { answerComment } from "@/lib/ai-reply";
import { loadProductVars } from "@/lib/catalog";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { getSessionUserId } from "@/lib/session";

export const maxDuration = 60;

const schema = z.object({
  accountId: z.string().min(1),
  mediaId: z.string().nullable().optional(),
  comment: z.string().trim().min(1, "Type a comment to try").max(500),
  instructions: z.string().max(1500).nullable().optional(),
});

// "Try a comment": runs the same AI + checks as a live comment, but sends nothing.
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured on the server (GEMINI_API_KEY)." }, { status: 503 });
  if (!rateLimit(`aitest:${userId}`, 20, 60_000)) return NextResponse.json({ error: "Slow down a little and try again in a minute." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const account = await db.igAccount.findFirst({ where: { id: d.accountId, userId } });
  if (!account) return NextResponse.json({ error: "Instagram account not found" }, { status: 404 });

  const products = await loadProductVars(account.id, d.mediaId ?? null);
  const result = await answerComment({ comment: d.comment, products, instructions: d.instructions, brand: account.username });
  return NextResponse.json({ result, products: products.map((p) => p.title), model: aiModel() });
}
