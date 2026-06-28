# Meal Planner — Image Proxy + Shared Cache

A tiny Cloudflare Worker that sits between the app and Google Imagen.

**Why:** the app used to call Imagen directly, shipping the billable Gemini key in
the app bundle and caching images *per device*. Every user regenerated the same
popular dishes, so the 70-images/day paid quota was exhausted in ~3–10 menus
across all users. This Worker keeps the key server-side and uses one **shared KV
cache** keyed by dish name — the first user anywhere to request a dish generates
it; everyone after reuses it for free.

## One-time setup (do these in order)

> You'll run these from this folder. Everything below is free-tier.

**1. Install dependencies**
```
cd weekly-meal-planner/image-proxy
npm install
```

**2. Create a free Cloudflare account**
Go to https://dash.cloudflare.com/sign-up — email + password, confirm the email.
No credit card needed for Workers/KV free tier.

**3. Log wrangler into your account**
```
npx wrangler login
```
This opens a browser to authorize. Approve it, then return to the terminal.

**4. Create the shared cache (KV namespace)**
```
npx wrangler kv namespace create IMAGE_CACHE
```
It prints an `id`. Copy it into `wrangler.toml` (replace `PASTE_KV_NAMESPACE_ID_HERE`).

**5. Set the Gemini API key as a secret** (this is the key that used to be in the app)
```
npx wrangler secret put GEMINI_API_KEY
```
Paste the Imagen/Gemini key when prompted. It's stored encrypted at Cloudflare,
never in git.

**6. (Recommended) Set an app token** so only your app can use the proxy
```
npx wrangler secret put APP_TOKEN
```
Enter any long random string. Put the same value in the app's
`EXPO_PUBLIC_IMAGE_PROXY_TOKEN` env var. If you skip this, the Worker stays open
to anyone who finds the URL (your Gemini key is still safe, but your quota isn't).

**7. Deploy**
```
npx wrangler deploy
```
It prints your Worker URL, e.g. `https://meal-planner-image-proxy.<you>.workers.dev`.
Put that in the app's `EXPO_PUBLIC_IMAGE_PROXY_URL` env var.

## Verify it's live
```
curl https://meal-planner-image-proxy.<you>.workers.dev
# -> {"ok":true,"service":"meal-planner-image-proxy"}
```

## Day-to-day
- Watch live logs: `npx wrangler tail`
- Redeploy after code changes: `npx wrangler deploy`
- Rotate the app token or Gemini key: re-run the matching `wrangler secret put`.

## Limits & upgrade path
- KV free tier: 100k reads/day, 1k writes/day, 1GB storage (~600 cached images
  with a 30-day TTL). Reads are the hot path, so this scales much further than
  70 Imagen calls/day. If storage or write volume becomes the bottleneck, move
  the image bytes to **R2** (10GB free) and keep only metadata in KV.
- There's no cross-request lock, so two users requesting the *same brand-new*
  dish in the same second may both generate it once. Rare and self-healing.
