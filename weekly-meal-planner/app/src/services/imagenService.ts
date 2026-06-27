import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const PHOTO_DIR = `${FileSystem.documentDirectory}recipe_photos/`;
const INGREDIENT_DIR = `${FileSystem.documentDirectory}ingredient_photos/`;
const INDEX_KEY = '@recipe_photo_index_v1';
const INGREDIENT_INDEX_KEY = '@ingredient_photo_index_v1';
const MAX_CACHE_ENTRIES = 100;
const IMAGEN_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict';

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

  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

  let b64: string | null = null;
  // Bound each attempt with an abort timeout so a hung image request can't stall
  // recipe (re)generation — the "New recipe" button used to spin indefinitely
  // when Imagen was slow. A burst of recipe photos can also trip Imagen's rate
  // limit; on 429 we back off and retry (was: give up immediately) so cards
  // don't end up stuck on the placeholder when a few requests get throttled.
  for (let attempt = 0; attempt < 3; attempt++) {
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
        // Rate limited — exponential-ish backoff, then retry.
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) break;
      const data = await res.json();
      b64 = data.predictions?.[0]?.bytesBase64Encoded ?? null;
      if (b64) break;
    } catch {
      // transient error or timeout — retry
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
