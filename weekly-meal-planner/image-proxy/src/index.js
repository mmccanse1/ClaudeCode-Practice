/**
 * Weekly Meal Planner — image proxy + shared cache (Cloudflare Worker).
 *
 * Why this exists: the app used to call Google Imagen directly from the client,
 * with the Gemini key shipped in the app bundle and a *per-device* image cache.
 * That meant (a) the billable key was exposed, and (b) every user regenerated
 * the same popular dishes independently, so the 70-images/day paid quota was
 * burned in ~3–10 menus across all users combined.
 *
 * This Worker fixes both: the key lives here as a secret, and a single KV store
 * is a *global* dish→image cache. The first user anywhere to request a given
 * dish generates it; everyone after that gets the cached bytes for free.
 *
 * Contract with the client:
 *   POST /  { "query": "lemon herb chicken", "kind": "food" | "ingredient" }
 *   ->      { "image": "<base64 png>" }                       (cache hit or fresh gen)
 *   ->      { "image": null, "reason": "quota" | "miss" | ... } (client falls back)
 * A null image is always returned with HTTP 200 so a generation failure degrades
 * gracefully to the client's free fallback (TheMealDB) rather than erroring.
 */

const IMAGEN_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict';

// Cached images expire after this long. KV has no LRU eviction, so a TTL is the
// safety valve that keeps the free 1GB store from filling forever. Re-generating
// a still-popular dish once a month is negligible cost.
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-app-token',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Mirror the client's normalization so keys are stable across devices. Prefix
// with kind so a food prompt and an ingredient prompt for the same word ("egg")
// don't collide on one cache entry.
function cacheKey(kind, query) {
  const slug = query.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').slice(0, 80);
  return `${kind}:${slug}`;
}

function promptFor(kind, query) {
  if (kind === 'ingredient') {
    return `professional product photography of ${query}, clean white background, sharp focus, studio lighting, ingredient shot`;
  }
  if (kind === 'day_scene') {
    // A served-meal scene (a dinner + its side) for the day card. We want a
    // close-up table shot with empty table surface in the lower foreground so the
    // app can place the day-of-week label there without covering the food. No
    // text — the app renders the label itself.
    return `close-up food photography of ${query}, plated and served together on a rustic wooden dining table, two dishes, warm natural light, cozy home dinner, shallow depth of field, appetizing, generous empty table surface in the lower foreground, absolutely no text, no words, no letters`;
  }
  return `professional food photography of ${query}, overhead shot, white ceramic plate, warm natural light, appetizing, restaurant quality`;
}

// Day-scene cards read better wide; dish/ingredient shots stay square.
function aspectRatioFor(kind) {
  return kind === 'day_scene' ? '4:3' : '1:1';
}

// Returns base64 string, or { quotaHit: true } on 429, or null on any other miss.
async function generateImage(prompt, apiKey, aspectRatio = '1:1') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${IMAGEN_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio },
      }),
      signal: controller.signal,
    });
    if (res.status === 429) return { quotaHit: true };
    if (!res.ok) return null;
    const data = await res.json();
    return data.predictions?.[0]?.bytesBase64Encoded ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method === 'GET') {
      return json({ ok: true, service: 'meal-planner-image-proxy' });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405);
    }

    // Optional shared-secret gate. If APP_TOKEN is configured, require it. This
    // doesn't make the proxy private (the token ships in the app), but it lets
    // you rotate/revoke access instantly and blocks casual abuse of your quota —
    // and unlike the old setup, the *billable* Gemini key never leaves here.
    if (env.APP_TOKEN && request.headers.get('x-app-token') !== env.APP_TOKEN) {
      return json({ error: 'unauthorized' }, 401);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'invalid json' }, 400);
    }

    const query = typeof payload?.query === 'string' ? payload.query.trim() : '';
    const kind =
      payload?.kind === 'ingredient' ? 'ingredient'
      : payload?.kind === 'day_scene' ? 'day_scene'
      : 'food';
    if (!query) return json({ error: 'missing query' }, 400);

    const key = cacheKey(kind, query);

    // 1) Shared cache hit — the common case once the app has real traffic.
    const cached = await env.IMAGE_CACHE.get(key);
    if (cached) return json({ image: cached, cached: true });

    // 2) Miss — generate once, then store for every future user.
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) return json({ image: null, reason: 'no_api_key' });

    const result = await generateImage(promptFor(kind, query), apiKey, aspectRatioFor(kind));
    if (result && result.quotaHit) return json({ image: null, reason: 'quota' });
    if (!result) return json({ image: null, reason: 'miss' });

    // Best-effort cache write; never fail the response if KV is unavailable.
    await env.IMAGE_CACHE.put(key, result, { expirationTtl: CACHE_TTL_SECONDS }).catch(() => {});
    return json({ image: result, cached: false });
  },
};
