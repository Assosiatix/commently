# Commently — Instagram comment → DM automation

Next.js 15 + Prisma 7 + Postgres. Users sign up, click **Connect Instagram** (OAuth popup), build automations (post + keywords → private DM + public reply), and the webhook engine does the rest.

Uses the official **Instagram API with Instagram Login**. Meta charges nothing for the API; your costs are hosting, DB and domain.

## Run locally

```bash
npm install
cp .env.example .env        # fill it (see below)
npx prisma migrate deploy   # creates tables
npm run dev
```

Meta needs **HTTPS** callbacks, so expose localhost: `ngrok http 3000` (or `cloudflared tunnel`) and put that URL in `APP_URL`.

Generate secrets:
```bash
openssl rand -hex 32   # AUTH_SECRET
openssl rand -hex 32   # ENCRYPTION_KEY (must be 64 hex chars)
openssl rand -hex 16   # CRON_SECRET / INSTAGRAM_WEBHOOK_VERIFY_TOKEN
```

## Meta dashboard setup (developers.facebook.com → your app → Instagram → API setup with Instagram login)

1. **Instagram app ID / secret** (the Instagram one, not the Facebook app ID) → `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`.
2. **Business login settings → OAuth redirect URI:** `${APP_URL}/api/instagram/callback`
   - Deauthorize callback: `${APP_URL}/api/instagram/deauthorize`
   - Data deletion request URL: `${APP_URL}/api/instagram/data-deletion`
3. **Webhooks → Callback URL:** `${APP_URL}/api/webhooks/instagram`, **Verify token:** same value as `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`. Subscribe to **comments** (and **messages**).
4. **Permissions:** `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages`.
5. App is in Development mode: add your account under **App roles → Roles → Instagram testers**, accept the invite in Instagram (Settings → Apps and websites → Tester invitations). Your account must be Business/Creator.
6. Privacy policy URL: `${APP_URL}/privacy` (edit the placeholder contact details in `/privacy` and `/terms` first).

Then sign up in the app → Connect Instagram → New automation → comment on your post from another account.

## Going live for other people

Needs **Advanced Access** via App Review for the 3 permissions (screencast of the flow, privacy policy, data-deletion URL) and usually **Business Verification** (legal business name/address documents). Until then only roles/testers can connect.

## Deploy (e.g. Vercel + Neon/Supabase)

Set all env vars, run `npx prisma migrate deploy` against the production DB. `vercel.json` schedules a daily token refresh (`/api/cron/refresh-tokens`, protected by `CRON_SECRET`). Long-lived tokens last ~60 days and are refreshed when <20 days remain.

## How it works

- `/api/webhooks/instagram` verifies `X-Hub-Signature-256` with the App Secret, acks 200 immediately, processes in `after()`.
- Engine (`src/lib/engine.ts`): ignores your own comments and comment replies, first matching enabled automation wins (Meta allows one private reply per comment, within 7 days), dedupes by `(automation, commentId)`, optional once-per-person, sends DM via `POST /{ig-id}/messages` with `recipient.comment_id`, then `POST /{comment-id}/replies`.
- Tokens are AES-256-GCM encrypted at rest; sessions are httpOnly JWT cookies; passwords bcrypt.

## Tests

```bash
DATABASE_URL=postgresql://... npm run test:engine   # mocked Graph API, 19 assertions
```

## Notes

- In-memory rate limiting on login/signup is per-instance; use Redis/Upstash if you run many instances.
- `{{username}}` in messages renders as `@username`.
- Never commit `.env` or share your App Secret / tokens.

## Shopify (public app, OAuth install)

Merchants type their `your-store.myshopify.com` in **Dashboard → Shopify**, approve the install on Shopify, and land back in the dashboard with the store showing **Connected** while products sync. Then **Dashboard → Catalog** lets them assign one or more products to each reel/post. Replies can use `{{product.title}}`, `{{product.price}}`, `{{product.stock}}`, `{{product.variants}}`, `{{product.link}}` and `{{products}}`, plus an optional "Buy" button per product.

Partner dashboard setup (Apps → Create app, distribution **Public**, or custom distribution while testing):

| Setting | Value |
|---|---|
| App URL | `${APP_URL}/dashboard/shopify` |
| Allowed redirection URL | `${APP_URL}/api/shopify/callback` |
| Scopes | `read_products,read_inventory` |
| Compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`) | `${APP_URL}/api/shopify/webhooks` |

Put the client ID/secret in `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`. The same `/api/shopify/webhooks` URL receives product, inventory and uninstall events (registered automatically after install). `/api/cron/sync-shopify` re-syncs daily as a safety net.

Tests (isolated, mocked APIs, only touch their own rows): `npx tsx scripts/test-shopify.ts`, `npx tsx scripts/test-followgate.ts`.

### Shopify CLI config files

`shopify.app.commently.toml` (development, ngrok URLs) and `shopify.app.production.toml` describe the app: URLs, scopes, webhooks and the compliance topics. Instead of filling the Partner dashboard by hand:

```bash
npm i -g @shopify/cli
shopify app config link                    # picks your Partner app and fills client_id
shopify app deploy                         # pushes URLs, scopes and webhooks
shopify app config link --config production && shopify app deploy --config production
```

Webhooks: with `use_legacy_install_flow = true` Shopify rejects app-specific product/inventory subscriptions in the TOML, so only the compliance topics live there and the app registers the product, inventory and uninstall webhooks per store through the API after install (leave `SHOPIFY_MANAGED_WEBHOOKS` empty). If your ngrok domain changes, edit the URLs in `shopify.app.commently.toml` and deploy again; for production replace `YOUR_DOMAIN` in `shopify.app.production.toml`.

## Two kinds of automation

**Reward automation** (keyword → DM): the commenter uses your keyword and gets exactly the messages you wrote: a first DM (with a tap-to-reply button and link buttons), an optional follow check, and a final message. Product variables (`{{product.price}}` …) fill in from the Shopify products linked to the reel.

**AI agent** (answers questions): watches one post, reads each comment and answers it from the linked Shopify products and the store notes you write (delivery, COD, returns). It replies in the language the person used, keeps answering in the DM thread for 7 days, skips praise/emoji/tags, and flags complaints or anything it cannot back up for a human on **Leads**. Every answer is checked before sending: prices, numbers and links must come from your data, otherwise the written fallback message is sent instead. Needs `GEMINI_API_KEY`.

If both exist on the same post, a reward whose keyword matches fires first; the agent answers all other comments. Instagram allows only one private reply per comment.

Tests: `npx tsx scripts/test-ai.ts` (mocked; `LIVE=1` also asks the real Gemini).
