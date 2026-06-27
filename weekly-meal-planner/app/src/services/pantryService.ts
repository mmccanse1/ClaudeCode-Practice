import AsyncStorage from '@react-native-async-storage/async-storage';

export type PantrySection = 'refrigerated' | 'spices' | 'dry_goods';

export interface CategorizedPantry {
  refrigerated: string[];
  spices: string[];
  dry_goods: string[];
}

const SECTIONS_KEY = '@meal_planner/pantry_sections_v1';
const LEGACY_KEY = '@meal_planner/pantry_v1';
const PHOTO_CACHE_KEY = '@meal_planner/pantry_photos_v1';

// Spices checked first — more specific matches win over fridge keyword substrings
const SPICE_KEYWORDS = [
  'paprika', 'smoked paprika', 'cumin', 'oregano', 'thyme', 'rosemary',
  'basil', 'turmeric', 'cinnamon', 'cayenne', 'cardamom', 'coriander',
  'nutmeg', 'allspice', 'sage', 'marjoram', 'dill weed', 'tarragon',
  'star anise', 'caraway', "za'atar", 'sumac', 'harissa',
  'ground ginger', 'ground coriander', 'ground cumin', 'ground cinnamon',
  'ground clove', 'ground cardamom', 'ground turmeric', 'ground allspice',
  'garlic powder', 'onion powder', 'curry powder', 'chili powder',
  'black pepper', 'white pepper', 'red pepper flake', 'peppercorn',
  'bay leaf', 'mustard seed', 'fennel seed', 'clove', 'vanilla bean',
  'seasoning', 'spice blend', 'extract',
  'salt', 'sea salt', 'kosher salt',
];

const FRIDGE_KEYWORDS = [
  // Proteins
  'chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp',
  'prawn', 'crab', 'scallop', 'cod', 'halibut', 'tilapia', 'sea bass',
  'bacon', 'sausage', 'ham', 'turkey', 'duck', 'steak', 'ground turkey',
  'tofu', 'tempeh',
  // Dairy & eggs
  'egg', 'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream',
  'sour cream', 'cream cheese', 'ricotta', 'mozzarella', 'cheddar',
  'parmesan', 'gouda', 'brie', 'feta',
  // Fresh produce
  'lettuce', 'spinach', 'kale', 'arugula', 'cabbage', 'tomato',
  'cucumber', 'carrot', 'celery', 'broccoli', 'cauliflower', 'asparagus',
  'bell pepper', 'jalapeño', 'scallion', 'green onion', 'leek',
  'mushroom', 'avocado', 'zucchini', 'eggplant', 'onion', 'shallot',
  'garlic', 'ginger', 'sweet potato', 'potato',
  'apple', 'orange', 'lemon', 'lime', 'grapefruit', 'banana',
  'strawberry', 'blueberry', 'raspberry', 'grape', 'cherry', 'peach', 'mango',
];

export function categorizeItem(item: string): PantrySection {
  const lower = item.toLowerCase().trim();
  if (SPICE_KEYWORDS.some(k => lower.includes(k))) return 'spices';
  if (FRIDGE_KEYWORDS.some(k => lower.includes(k))) return 'refrigerated';
  return 'dry_goods';
}

function empty(): CategorizedPantry {
  return { refrigerated: [], spices: [], dry_goods: [] };
}

function toFlat(pantry: CategorizedPantry): string[] {
  return [...pantry.refrigerated, ...pantry.spices, ...pantry.dry_goods].sort();
}

async function migrateLegacy(): Promise<CategorizedPantry | null> {
  const json = await AsyncStorage.getItem(LEGACY_KEY);
  if (!json) return null;
  const flat: string[] = JSON.parse(json);
  const pantry = empty();
  flat.forEach(item => pantry[categorizeItem(item)].push(item));
  Object.values(pantry).forEach(arr => arr.sort());
  await AsyncStorage.setItem(SECTIONS_KEY, JSON.stringify(pantry));
  await AsyncStorage.removeItem(LEGACY_KEY);
  return pantry;
}

async function readPantry(): Promise<CategorizedPantry> {
  const json = await AsyncStorage.getItem(SECTIONS_KEY);
  if (json) return JSON.parse(json);
  return (await migrateLegacy()) ?? empty();
}

async function writePantry(pantry: CategorizedPantry): Promise<void> {
  await AsyncStorage.setItem(SECTIONS_KEY, JSON.stringify(pantry));
}

export async function getCategorizedPantry(): Promise<CategorizedPantry> {
  return readPantry();
}

export async function getPantryItems(): Promise<string[]> {
  return toFlat(await readPantry());
}

// True if the (already normalized) item is present in ANY pantry section.
// Checking across all sections — not just the one categorizeItem would pick —
// guards against duplicate entries when a recurring item (milk, eggs) is scanned
// again, or when categorization shifts between app versions. Duplicate entries
// also bloat the cached photo index over time, so this is the single choke point.
function existsInPantry(pantry: CategorizedPantry, item: string): boolean {
  return (
    pantry.refrigerated.includes(item) ||
    pantry.spices.includes(item) ||
    pantry.dry_goods.includes(item)
  );
}

export async function addPantryItem(item: string): Promise<string[]> {
  const trimmed = item.trim().toLowerCase();
  if (!trimmed) return getPantryItems();
  const pantry = await readPantry();
  if (!existsInPantry(pantry, trimmed)) {
    const section = categorizeItem(trimmed);
    pantry[section] = [...pantry[section], trimmed].sort();
    await writePantry(pantry);
  }
  return toFlat(pantry);
}

export async function addPantryItems(newItems: string[]): Promise<string[]> {
  const pantry = await readPantry();
  const cleaned = newItems.map(i => i.trim().toLowerCase()).filter(Boolean);
  cleaned.forEach(item => {
    if (!existsInPantry(pantry, item)) {
      pantry[categorizeItem(item)].push(item);
    }
  });
  Object.values(pantry).forEach(arr => arr.sort());
  await writePantry(pantry);
  return toFlat(pantry);
}

export async function removePantryItem(item: string): Promise<string[]> {
  const pantry = await readPantry();
  pantry.refrigerated = pantry.refrigerated.filter(i => i !== item);
  pantry.spices = pantry.spices.filter(i => i !== item);
  pantry.dry_goods = pantry.dry_goods.filter(i => i !== item);
  await writePantry(pantry);
  return toFlat(pantry);
}

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
  await AsyncStorage.removeItem(SECTIONS_KEY);
  await AsyncStorage.removeItem(LEGACY_KEY);
  await AsyncStorage.removeItem(PHOTO_CACHE_KEY);
}

export async function lookupBarcode(
  barcode: string
): Promise<{ name: string; photoUrl: string | null } | null> {
  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 10000));
  const lookup = async (): Promise<{ name: string; photoUrl: string | null } | null> => {
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
  };
  return Promise.race([lookup(), timeout]);
}
