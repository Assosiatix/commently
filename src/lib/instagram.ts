/**
 * Instagram API with Instagram Login (Business Login for Instagram).
 * Docs: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login
 */
export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
];

export class IgApiError extends Error {
  constructor(message: string, public status: number, public code?: number, public subcode?: number) {
    super(message);
  }
}

const version = () => process.env.INSTAGRAM_API_VERSION || "v26.0";
const graph = () => `https://graph.instagram.com/${version()}`;
const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};

export const redirectUri = () => `${need("APP_URL").replace(/\/$/, "")}/api/instagram/callback`;

export function buildAuthUrl(state: string) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", need("INSTAGRAM_APP_ID"));
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", IG_SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

async function parse(res: Response) {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-json */
  }
  if (!res.ok || json?.error || json?.error_message) {
    const e = json?.error ?? json ?? {};
    const msg = e.message ?? e.error_message ?? json?.error_message ?? text.slice(0, 300) ?? "Instagram API error";
    throw new IgApiError(String(msg), res.status, e.code, e.error_subcode);
  }
  return json;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Step 1: authorization code -> short-lived token (valid ~1h). */
export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    client_id: need("INSTAGRAM_APP_ID"),
    client_secret: need("INSTAGRAM_APP_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code: code.replace(/#_$/, ""),
  });
  const j = await parse(await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body }));
  const d = Array.isArray(j?.data) ? j.data[0] : j;
  if (!d?.access_token) throw new IgApiError("No access token in response", 400);
  return { accessToken: String(d.access_token), userId: String(d.user_id), permissions: String(d.permissions ?? "") };
}

/** Step 2: short-lived -> long-lived token (~60 days). */
export async function toLongLived(shortToken: string) {
  const u = new URL("https://graph.instagram.com/access_token");
  u.searchParams.set("grant_type", "ig_exchange_token");
  u.searchParams.set("client_secret", need("INSTAGRAM_APP_SECRET"));
  u.searchParams.set("access_token", shortToken);
  const j = await parse(await fetch(u));
  return { accessToken: String(j.access_token), expiresIn: Number(j.expires_in) };
}

/** Long-lived token must be >=24h old and not expired. */
export async function refreshLongLived(token: string) {
  const u = new URL("https://graph.instagram.com/refresh_access_token");
  u.searchParams.set("grant_type", "ig_refresh_token");
  u.searchParams.set("access_token", token);
  const j = await parse(await fetch(u));
  return { accessToken: String(j.access_token), expiresIn: Number(j.expires_in) };
}

export async function getProfile(token: string) {
  const u = new URL(`${graph()}/me`);
  u.searchParams.set("fields", "user_id,username,account_type,profile_picture_url");
  const j = await parse(await fetch(u, { headers: auth(token) }));
  return {
    // `user_id` = professional account id = the id Meta sends in webhook entry.id
    igUserId: String(j.user_id ?? j.id),
    appScopedId: j.id ? String(j.id) : null,
    username: String(j.username ?? ""),
    accountType: (j.account_type as string | undefined) ?? null,
    profilePictureUrl: (j.profile_picture_url as string | undefined) ?? null,
  };
}

/** Subscribes this account to webhook fields. Callback URL itself is set once in the Meta App Dashboard. */
export async function subscribeWebhooks(igUserId: string, token: string) {
  const call = async (fields: string) => {
    const body = new URLSearchParams({ subscribed_fields: fields });
    return parse(await fetch(`${graph()}/${igUserId}/subscribed_apps`, { method: "POST", headers: auth(token), body }));
  };
  try {
    await call("comments,messages");
  } catch {
    await call("comments"); // messages field may be unavailable before approval
  }
}

export type MediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

export async function listMedia(token: string, limit = 30): Promise<MediaItem[]> {
  const u = new URL(`${graph()}/me/media`);
  u.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
  u.searchParams.set("limit", String(limit));
  const j = await parse(await fetch(u, { headers: auth(token) }));
  return (j?.data ?? []) as MediaItem[];
}

/** One private reply per comment, within 7 days of the comment. */
export async function sendPrivateReply(igUserId: string, token: string, commentId: string, text: string) {
  const res = await fetch(`${graph()}/${igUserId}/messages`, {
    method: "POST",
    headers: { ...auth(token), "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text } }),
  });
  return parse(res) as Promise<{ recipient_id?: string; message_id?: string }>;
}

/** Plain DM to a person who has messaged us (inside the 24h window), by Instagram-scoped id. */
export async function sendMessage(igUserId: string, token: string, recipientId: string, text: string) {
  const res = await fetch(`${graph()}/${igUserId}/messages`, {
    method: "POST",
    headers: { ...auth(token), "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  return parse(res) as Promise<{ recipient_id?: string; message_id?: string }>;
}

export async function replyToComment(token: string, commentId: string, text: string) {
  const body = new URLSearchParams({ message: text });
  return parse(await fetch(`${graph()}/${commentId}/replies`, { method: "POST", headers: auth(token), body }));
}
export const STATE_COOKIE = "ig_oauth";

// ---------------------------------------------------------------------------------------------
// Rich DMs: text + link buttons + tap-to-reply chips, with graceful fallback.
// ---------------------------------------------------------------------------------------------
export type DmButton = { title: string; url: string };
export type DmContent = { text: string; buttons?: DmButton[]; quickReplies?: string[] };

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** rich = button template + chips, links = buttons appended as plain URLs + chips, plain = text only. */
export function buildMessage(c: DmContent, mode: "rich" | "links" | "plain") {
  const buttons = (c.buttons ?? []).slice(0, 3);
  const chips = (c.quickReplies ?? []).filter(Boolean).slice(0, 13).map((t) => ({ content_type: "text", title: cut(t, 20), payload: cut(t, 100) }));
  if (mode === "plain") return { text: c.text };
  if (mode === "links") return { text: c.text + buttons.map((b) => `\n\n${b.title}: ${b.url}`).join(""), ...(chips.length && { quick_replies: chips }) };
  if (!buttons.length) return { text: c.text, ...(chips.length && { quick_replies: chips }) };
  return {
    attachment: { type: "template", payload: { template_type: "button", text: cut(c.text, 640), buttons: buttons.map((b) => ({ type: "web_url", url: b.url, title: cut(b.title, 20) })) } },
    ...(chips.length && { quick_replies: chips }),
  };
}

/** Sends a DM to a commenter (private reply) or to a person who messaged us. Falls back if Instagram rejects the rich format. */
export async function sendDm(igUserId: string, token: string, to: { comment_id: string } | { id: string }, content: DmContent) {
  const modes: ("rich" | "links" | "plain")[] = ["rich"];
  if (content.buttons?.length || content.quickReplies?.length) modes.push("links", "plain");
  let last: unknown;
  for (const mode of modes) {
    try {
      const res = await fetch(`${graph()}/${igUserId}/messages`, {
        method: "POST",
        headers: { ...auth(token), "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: to, message: buildMessage(content, mode) }),
      });
      return (await parse(res)) as { recipient_id?: string; message_id?: string };
    } catch (e) {
      last = e;
      if (!(e instanceof IgApiError) || e.status !== 400) throw e; // only format problems are worth retrying simpler
    }
  }
  throw last;
}

/** Does this person follow the business? null = Instagram would not tell us (treated as "unknown"). */
export async function getFollowStatus(token: string, igsid: string): Promise<boolean | null> {
  try {
    const u = new URL(`${graph()}/${igsid}`);
    u.searchParams.set("fields", "is_user_follow_business,username");
    const j = await parse(await fetch(u, { headers: auth(token) }));
    return typeof j?.is_user_follow_business === "boolean" ? j.is_user_follow_business : null;
  } catch {
    return null;
  }
}
