import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, aiModel } from "@/lib/ai";
import { answerComment, buildContext, coverage } from "@/lib/ai-reply";
import { joinNotes, loadProductVars, loadStoreNotes } from "@/lib/catalog";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { getSessionUserId } from "@/lib/session";

export const maxDuration = 60;

const schema = z.object({
  accountId: z.string().min(1),
  mediaId: z.string().nullable().optional(),
  comment: z.string().trim().max(500).optional(),
  instructions: z.string().max(1500).nullable().optional(),
});

// "Try a comment": runs the same AI + checks as a live comment, but sends nothing.
// Without a comment it only reports what the agent knows (coverage + the exact data it is shown), at no AI cost.
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const account = await db.igAccount.findFirst({ where: { id: d.accountId, userId } });
  if (!account) return NextResponse.json({ error: "Instagram account not found" }, { status: 404 });

  const products = await loadProductVars(account.id, d.mediaId ?? null);
  const instructions = joinNotes(await loadStoreNotes(userId), d.instructions);
  const knows = { coverage: coverage(products, instructions), context: buildContext(products, instructions), products: products.map((p) => p.title), model: aiModel() };

  if (!d.comment) return NextResponse.json({ ...knows, result: null });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured on the server (GEMINI_API_KEY)." }, { status: 503 });
  if (!rateLimit(`aitest:${userId}`, 20, 60_000)) return NextResponse.json({ error: "Slow down a little and try again in a minute." }, { status: 429 });

  const result = await answerComment({ comment: d.comment, products, instructions, brand: account.username });
  return NextResponse.json({ ...knows, result });
}
