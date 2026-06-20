const UNSPLASH_BASE = 'https://api.unsplash.com';

function sourceUnsplashUrl(query: string, width: number, height: number, extraTerms = ''): string {
  const q = encodeURIComponent(`${query}${extraTerms ? ' ' + extraTerms : ''}`);
  return `https://source.unsplash.com/${width}x${height}/?${q}`;
}

async function searchUnsplash(
  query: string,
  orientation: 'landscape' | 'squarish' = 'landscape',
  fallbackWidth = 800,
  fallbackHeight = 600,
  fallbackExtra = ''
): Promise<string | null> {
  const accessKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
  const hasValidKey = accessKey && accessKey !== 'your_unsplash_access_key_here';

  if (!hasValidKey) {
    return sourceUnsplashUrl(query, fallbackWidth, fallbackHeight, fallbackExtra);
  }

  try {
    const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=5&orientation=${orientation}&content_filter=high`;

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) return sourceUnsplashUrl(query, fallbackWidth, fallbackHeight, fallbackExtra);

    const data = await res.json();
    const results = data.results ?? [];
    const url0 = results[0]?.urls?.regular;
    return url0 ?? sourceUnsplashUrl(query, fallbackWidth, fallbackHeight, fallbackExtra);
  } catch {
    return sourceUnsplashUrl(query, fallbackWidth, fallbackHeight, fallbackExtra);
  }
}

async function fetchOpenFoodFactsPhoto(query: string): Promise<string | null> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=5&fields=image_front_url,image_url`;
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

async function fetchWikipediaPhoto(query: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=300&redirects=1&origin=*`;
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
  const productPhoto = await fetchOpenFoodFactsPhoto(query);
  if (productPhoto) return productPhoto;
  const wikiPhoto = await fetchWikipediaPhoto(query);
  if (wikiPhoto) return wikiPhoto;
  return searchUnsplash(`${query} ingredient food`, 'squarish', 200, 200, 'food ingredient');
}

export async function fetchFoodPhoto(query: string): Promise<string | null> {
  return searchUnsplash(
    `${query} food plated meal`,
    'squarish',
    800,
    800,
    'food meal cooking recipe'
  );
}

export async function fetchSceneryPhoto(query: string): Promise<string | null> {
  return searchUnsplash(query, 'landscape', 1200, 600);
}
