import AsyncStorage from '@react-native-async-storage/async-storage';

const PANTRY_KEY = '@meal_planner/pantry_v1';

export async function getPantryItems(): Promise<string[]> {
  const json = await AsyncStorage.getItem(PANTRY_KEY);
  return json ? JSON.parse(json) : [];
}

export async function addPantryItem(item: string): Promise<string[]> {
  const trimmed = item.trim().toLowerCase();
  if (!trimmed) return getPantryItems();

  const items = await getPantryItems();
  if (items.includes(trimmed)) return items;

  const updated = [...items, trimmed].sort();
  await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(updated));
  return updated;
}

export async function addPantryItems(newItems: string[]): Promise<string[]> {
  const items = await getPantryItems();
  const merged = Array.from(
    new Set([...items, ...newItems.map(i => i.trim().toLowerCase()).filter(Boolean)])
  ).sort();
  await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(merged));
  return merged;
}

export async function removePantryItem(item: string): Promise<string[]> {
  const items = await getPantryItems();
  const updated = items.filter(i => i !== item);
  await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(updated));
  return updated;
}

const PHOTO_CACHE_KEY = '@meal_planner/pantry_photos_v1';

export async function getPantryPhotoCache(): Promise<Record<string, string>> {
  const json = await AsyncStorage.getItem(PHOTO_CACHE_KEY);
  return json ? JSON.parse(json) : {};
}

export async function setPantryPhoto(name: string, photoUrl: string): Promise<void> {
  const cache = await getPantryPhotoCache();
  cache[name.trim().toLowerCase()] = photoUrl;
  await AsyncStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(cache));
}

export async function removePantryPhoto(name: string): Promise<void> {
  const cache = await getPantryPhotoCache();
  delete cache[name.trim().toLowerCase()];
  await AsyncStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(cache));
}

export async function clearPantry(): Promise<void> {
  await AsyncStorage.removeItem(PANTRY_KEY);
  await AsyncStorage.removeItem(PHOTO_CACHE_KEY);
}

export async function lookupBarcode(
  barcode: string
): Promise<{ name: string; photoUrl: string | null } | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1) return null;
    const name =
      data.product?.product_name_en ||
      data.product?.product_name ||
      data.product?.generic_name;
    if (!name) return null;
    const photoUrl =
      data.product?.image_front_url ?? data.product?.image_url ?? null;
    return { name: String(name).trim(), photoUrl };
  } catch {
    return null;
  }
}
