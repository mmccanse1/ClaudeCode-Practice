import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const PHOTO_DIR = `${FileSystem.documentDirectory}recipe_photos/`;
const INGREDIENT_DIR = `${FileSystem.documentDirectory}ingredient_photos/`;
const INDEX_KEY = '@recipe_photo_index_v1';
const INGREDIENT_INDEX_KEY = '@ingredient_photo_index_v1';
const MAX_CACHE_ENTRIES = 100;
const IMAGEN_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict';

// Circuit breaker. When Imagen returns 429 (per-minute rate limit OR the daily
// quota being exhausted), skip further calls for a short cooldown. Without this,
// every image in a 7–21 image batch retries against a limit that won't clear
// this instant, so generation crawls and still ends on placeholders.
const IMAGEN_COOLDOWN_MS = 60_000;
let imagenCooldownUntil = 0;

function cacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').slice(0, 80);
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


async function generateAndCache(
  prompt: string,
  dir: string,
  indexKey: string,
  cacheK: string
): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!apiKey) return null;

  // Circuit open from a recent 429 — fast-fail to the caller's fallback instead
  // of retrying against a limit that won't have cleared yet.
  if (Date.now() < imagenCooldownUntil) return null;

  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

  let b64: string | null = null;
  // Bound each attempt with an abort timeout so a hung image request can't stall
  // recipe (re)generation. On 429 we trip the circuit breaker and stop: the daily
  // quota / rate limit won't recover mid-batch, so retrying every image just makes
  // generation crawl. The cooldown lets a later attempt probe for recovery.
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${IMAGEN_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
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
      b64 = data.predictions?.[0]?.bytesBase64Encoded ?? null;
      if (b64) break;
    } catch {
      // transient error or timeout — retry once
    } finally {
      clearTimeout(timeoutId);
    }
  }
  if (!b64) return null;

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
  return generateAndCache(
    `professional food photography of ${query}, overhead shot, white ceramic plate, warm natural light, appetizing, restaurant quality`,
    PHOTO_DIR,
    INDEX_KEY,
    key
  );
}

export async function generateIngredientPhoto(query: string): Promise<string | null> {
  const key = cacheKey(query);
  const index = await getIndex(INGREDIENT_INDEX_KEY);
  if (index[key]) {
    const info = await FileSystem.getInfoAsync(index[key]);
    if (info.exists) return index[key];
  }
  return generateAndCache(
    `professional product photography of ${query}, clean white background, sharp focus, studio lighting, ingredient shot`,
    INGREDIENT_DIR,
    INGREDIENT_INDEX_KEY,
    key
  );
}
