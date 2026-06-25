import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const PHOTO_DIR = `${FileSystem.documentDirectory}recipe_photos/`;
const INDEX_KEY = '@recipe_photo_index_v1';
const IMAGEN_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict';

function cacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').slice(0, 80);
}

async function getIndex(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveToIndex(key: string, filePath: string): Promise<void> {
  try {
    const index = await getIndex();
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify({ ...index, [key]: filePath }));
  } catch {}
}

export async function generateFoodPhoto(query: string): Promise<string | null> {
  const key = cacheKey(query);

  const index = await getIndex();
  if (index[key]) {
    const info = await FileSystem.getInfoAsync(index[key]);
    if (info.exists) return index[key];
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!apiKey) return null;

  try {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true }).catch(() => {});

    const res = await fetch(`${IMAGEN_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [
          {
            prompt: `professional food photography of ${query}, overhead shot, white ceramic plate, warm natural light, appetizing, restaurant quality`,
          },
        ],
        parameters: { sampleCount: 1, aspectRatio: '1:1' },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const b64: string | undefined = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) return null;

    const filePath = `${PHOTO_DIR}${key}.png`;
    await FileSystem.writeAsStringAsync(filePath, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await saveToIndex(key, filePath);
    return filePath;
  } catch {
    return null;
  }
}
