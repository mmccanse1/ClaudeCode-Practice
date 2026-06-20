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

export async function clearPantry(): Promise<void> {
  await AsyncStorage.removeItem(PANTRY_KEY);
}

export async function lookupBarcode(barcode: string): Promise<string | null> {
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
    return name ? String(name).trim() : null;
  } catch {
    return null;
  }
}
