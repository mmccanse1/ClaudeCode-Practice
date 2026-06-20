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

async function fetchMealDBPhoto(query: string): Promise<string | null> {
  const candidates = [
    query.trim(),
    query.trim().split(' ').pop() ?? '',
    query.trim().split(' ').slice(-2).join(' '),
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  for (const term of candidates) {
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

export async function fetchFoodPhoto(query: string): Promise<string | null> {
  return searchUnsplash(`${query} food plated meal`, 'squarish');
}

export async function fetchSceneryPhoto(query: string): Promise<string | null> {
  return searchUnsplash(query, 'landscape');
}
