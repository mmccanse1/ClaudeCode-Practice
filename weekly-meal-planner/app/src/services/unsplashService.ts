const UNSPLASH_BASE = 'https://api.unsplash.com';

async function searchUnsplash(
  query: string,
  orientation: 'landscape' | 'squarish' = 'landscape'
): Promise<string | null> {
  const accessKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
  const hasValidKey = accessKey && accessKey !== 'your_unsplash_access_key_here';
  if (!hasValidKey) return null;

  try {
    const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=5&orientation=${orientation}&content_filter=high`;

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    return (data.results ?? [])[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

async function fetchOpenFoodFactsPhoto(query: string): Promise<string | null> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&json=1&page_size=5&fields=image_front_url,image_url`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const products: any[] = data.products ?? [];
    for (const p of products) {
      const img = p.image_front_url ?? p.image_url;
      if (img) return img;
    }
    return null;
  } catch {
    return null;
  }
}

const MODIFIER_WORDS = new Set([
  'canned', 'frozen', 'fresh', 'dried', 'organic', 'raw', 'cooked',
  'sliced', 'diced', 'chopped', 'minced', 'ground', 'whole', 'baby',
  'large', 'small', 'medium', 'extra', 'boneless', 'skinless',
  'unsalted', 'salted', 'plain', 'original', 'lean', 'shredded',
  'grated', 'crushed', 'peeled', 'seeded', 'low', 'reduced', 'fat',
]);

function toSingular(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ves')) return word.slice(0, -3) + 'f';
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
  return word;
}

function mealDBCandidates(query: string): string[] {
  const lower = query.trim().toLowerCase();
  const words = lower.split(/\s+/);
  const core = words.filter(w => !MODIFIER_WORDS.has(w));
  const coreStr = core.join(' ');
  const lastWord = core[core.length - 1] ?? '';
  const firstWord = core[0] ?? '';

  const seen = new Set<string>();
  const out: string[] = [];
  const add = (s: string) => {
    const t = s.trim();
    if (t && !seen.has(t)) { seen.add(t); out.push(t); }
  };

  add(lower);                          // original: "canned tomatoes"
  add(coreStr);                        // stripped: "tomatoes"
  add(toSingular(coreStr));            // singular: "tomato"
  add(firstWord);                      // first core word: "chicken"
  add(toSingular(firstWord));          // singular first: "chicken"
  add(lastWord);                       // last core word: "thighs"
  add(toSingular(lastWord));           // singular last: "thigh"
  if (core.length > 1) add(core.slice(0, 2).join(' ')); // first two: "chicken thigh"

  return out;
}

async function fetchMealDBPhoto(query: string): Promise<string | null> {
  for (const term of mealDBCandidates(query)) {
    const url = `https://www.themealdb.com/images/ingredients/${encodeURIComponent(term)}-Small.png`;
    try {
      const res = await fetch(url);
      if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image')) return url;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function fetchWikipediaPhoto(query: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      query
    )}&prop=pageimages&format=json&pithumbsize=300&redirects=1&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = Object.values(data.query?.pages ?? {}) as any[];
    for (const page of pages) {
      if ((page as any).thumbnail?.source) return (page as any).thumbnail.source;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchIngredientPhoto(query: string): Promise<string | null> {
  const off = await fetchOpenFoodFactsPhoto(query);
  if (off) return off;
  const mdb = await fetchMealDBPhoto(query);
  if (mdb) return mdb;
  const wiki = await fetchWikipediaPhoto(query);
  if (wiki) return wiki;
  return searchUnsplash(`${query} food ingredient`, 'squarish');
}

async function fetchMealDBRecipePhoto(query: string): Promise<string | null> {
  try {
    const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const meals: any[] = data.meals ?? [];
    return meals[0]?.strMealThumb ?? null;
  } catch {
    return null;
  }
}

export async function fetchFoodPhoto(query: string): Promise<string | null> {
  const mdbPhoto = await fetchMealDBRecipePhoto(query);
  if (mdbPhoto) return mdbPhoto;
  return searchUnsplash(`${query} food plated meal`, 'squarish');
}

export async function fetchSceneryPhoto(query: string): Promise<string | null> {
  const url = await searchUnsplash(query, 'landscape');
  if (url) return url;
  return fetchWikipediaPhoto('Santorini');
}
