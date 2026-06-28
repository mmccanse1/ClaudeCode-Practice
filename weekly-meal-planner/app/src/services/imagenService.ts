import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const PHOTO_DIR = `${FileSystem.documentDirectory}recipe_photos/`;
const INGREDIENT_DIR = `${FileSystem.documentDirectory}ingredient_photos/`;
const INDEX_KEY = '@recipe_photo_index_v1';
const INGREDIENT_INDEX_KEY = '@ingredient_photo_index_v1';
const MAX_CACHE_ENTRIES = 100;
const IMAGEN_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict';

// Image source: a shared-cache proxy (Cloudflare Worker, see image-proxy/). It
// keeps the Gemini key server-side and generates each unique dish ONCE globally,
// so the paid Imagen quota is no longer burned per-device. If no proxy URL is
// configured (e.g. before the Worker is deployed) we fall back to calling Imagen
// directly with the legacy client key, so nothing breaks during the transition.
const PROXY_URL = process.env.EXPO_PUBLIC_IMAGE_PROXY_URL ?? '';
const PROXY_TOKEN = process.env.EXPO_PUBLIC_IMAGE_PROXY_TOKEN ?? '';
const LEGACY_GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

// Circuit breaker. When the upstream signals a 429 (per-minute rate limit OR the
// daily quota being exhausted), skip further calls for a short cooldown. Without
// this, every image in a 7–21 image batch retries against a limit that won't
// clear this instant, so generation crawls and still ends on placeholders.
const IMAGEN_COOLDOWN_MS = 60_000;
let imagenCooldownUntil = 0;

type PhotoKind = 'food' | 'ingredient';

function cacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').slice(0, 80);
}

// Used only by the legacy direct-Imagen path; the proxy builds the prompt
// server-side so it can be tuned without shipping an app update.
function promptFor(kind: PhotoKind, query: string): string {
  return kind === 'ingredient'
    ? `professional product photography of ${query}, clean white background, sharp focus, studio lighting, ingredient shot`
    : `professional food photography of ${query}, overhead shot, white ceramic plate, warm natural light, appetizing, restaurant quality`;
}

async function getIndex(storageKey: string): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveToIndex(storageKey: string, key: string, filePath: string): Promise<void> {
  try {
    const index = await getIndex(storageKey);
    const updated: Record<string, string> = { ...index, [key]: filePath };
    const keys = Object.keys(updated);
    if (keys.length > MAX_CACHE_ENTRIES) {
      const toEvict = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
      for (const k of toEvict) {
        await FileSystem.deleteAsync(updated[k], { idempotent: true }).catch(() => {});
        delete updated[k];
      }
    }
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  } catch {}
}

// Fetch base64 image bytes for a query. Prefers the shared-cache proxy; falls
// back to a direct Imagen call only when no proxy URL is configured. Returns
// null on any miss/quota/error so the caller drops to its free image fallback.
// Each attempt is bounded by an abort timeout so a hung request can't stall
// recipe (re)generation; on a quota signal we trip the circuit breaker and stop.
async function fetchImageBase64(query: string, kind: PhotoKind): Promise<string | null> {
  if (Date.now() < imagenCooldownUntil) return null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    try {
      if (PROXY_URL) {
        const res = await fetch(PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(PROXY_TOKEN ? { 'x-app-token': PROXY_TOKEN } : {}),
          },
          body: JSON.stringify({ query, kind }),
          signal: controller.signal,
        });
        if (!res.ok) break; // 401/5xx — don't hammer, fall back
        const data = await res.json();
        if (data?.reason === 'quota') {
          imagenCooldownUntil = Date.now() + IMAGEN_COOLDOWN_MS;
          break;
        }
        if (data?.image) return data.image as string;
        break; // cache miss + generation unavailable
      }

      if (LEGACY_GEMINI_KEY) {
        const res = await fetch(`${IMAGEN_URL}?key=${LEGACY_GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: promptFor(kind, query) }],
            parameters: { sampleCount: 1, aspectRatio: '1:1' },
          }),
          signal: controller.signal,
        });
        if (res.status === 429) {
          imagenCooldownUntil = Date.now() + IMAGEN_COOLDOWN_MS;
          break;
        }
        if (!res.ok) break;
        const data = await res.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded ?? null;
        if (b64) return b64;
        break;
      }

      return null; // neither proxy nor legacy key configured
    } catch {
      // transient error or timeout — retry once
    } finally {
      clearTimeout(timeoutId);
    }
  }
  return null;
}

async function generateAndCache(
  query: string,
  kind: PhotoKind,
  dir: string,
  indexKey: string,
  cacheK: string
): Promise<string | null> {
  const b64 = await fetchImageBase64(query, kind);
  if (!b64) return null;

  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const filePath = `${dir}${cacheK}.png`;
  await FileSystem.writeAsStringAsync(filePath, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await saveToIndex(indexKey, cacheK, filePath);
  return filePath;
}

export async function generateFoodPhoto(query: string): Promise<string | null> {
  const key = cacheKey(query);
  const index = await getIndex(INDEX_KEY);
  if (index[key]) {
    const info = await FileSystem.getInfoAsync(index[key]);
    if (info.exists) return index[key];
  }
  return generateAndCache(query, 'food', PHOTO_DIR, INDEX_KEY, key);
}

export async function generateIngredientPhoto(query: string): Promise<string | null> {
  const key = cacheKey(query);
  const index = await getIndex(INGREDIENT_INDEX_KEY);
  if (index[key]) {
    const info = await FileSystem.getInfoAsync(index[key]);
    if (info.exists) return index[key];
  }
  return generateAndCache(query, 'ingredient', INGREDIENT_DIR, INGREDIENT_INDEX_KEY, key);
}
