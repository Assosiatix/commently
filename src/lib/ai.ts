/**
 * Minimal Google Gemini client (REST, no SDK) that returns schema-constrained JSON.
 * Docs: https://ai.google.dev/api/generate-content
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const aiConfigured = () => !!process.env.GEMINI_API_KEY;

// Google retires models regularly (2.5 flash is already closed to new keys), so a request walks down this list
// when a model is gone or overloaded. GEMINI_MODEL, when set, is tried first.
const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
export const aiModels = () => [...new Set([process.env.GEMINI_MODEL, ...DEFAULT_MODELS].filter((m): m is string => !!m))];
export const aiModel = () => aiModels()[0];

export class AiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

type Schema = { type: string; properties?: Record<string, unknown>; required?: string[]; enum?: string[]; items?: unknown; description?: string };

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One model, one retry on throttling/5xx. Throws AiError with `status` so the caller can decide to switch models. */
async function callModel(model: string, key: string, body: unknown, timeoutMs: number): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const j = (await res.json().catch(() => ({}))) as GeminiResponse;
      if ((res.status === 429 || res.status >= 500) && attempt < 1) { await sleep(600); continue; }
      if (!res.ok) throw new AiError(j.error?.message?.slice(0, 200) || `Gemini ${res.status}`, res.status);
      if (j.promptFeedback?.blockReason) throw new AiError(`Blocked by Gemini: ${j.promptFeedback.blockReason}`, 422);
      const cand = j.candidates?.[0];
      const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text) throw new AiError(`Empty Gemini response (${cand?.finishReason ?? "no candidate"})`, 502);
      return text;
    } catch (e) {
      if (e instanceof AiError) throw e;
      const timedOut = e instanceof Error && e.name === "AbortError";
      if (attempt < 1) { await sleep(400); continue; }
      throw new AiError(timedOut ? "Gemini timed out" : `Gemini request failed: ${e instanceof Error ? e.message : e}`, timedOut ? 504 : 0);
    } finally {
      clearTimeout(timer);
    }
  }
}

export async function geminiJson<T>(opts: { system: string; user: string; schema: Schema; maxTokens?: number; timeoutMs?: number }): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("GEMINI_API_KEY is not set");
  let last: AiError | undefined;
  for (const model of aiModels()) {
    const body = {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: opts.maxTokens ?? 600,
        responseMimeType: "application/json",
        responseSchema: opts.schema,
        ...(model.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    };
    try {
      const text = await callModel(model, key, body, opts.timeoutMs ?? 10_000);
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new AiError("Gemini returned invalid JSON", 502);
      }
    } catch (e) {
      last = e instanceof AiError ? e : new AiError(String(e));
      // model retired/unknown, throttled, overloaded or timed out: try the next one. Anything else (bad key, blocked prompt) will not improve.
      const switchable = last.status === 404 || last.status === 429 || last.status >= 500 || last.status === 0 || /no longer available/i.test(last.message);
      if (!switchable) break;
    }
  }
  throw last ?? new AiError("Gemini request failed");
}
