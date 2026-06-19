const UNSPLASH_BASE = 'https://api.unsplash.com';

async function searchUnsplash(
  query: string,
  orientation: 'landscape' | 'squarish' = 'landscape'
): Promise<string | null> {
  const accessKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=1&orientation=${orientation}&content_filter=high`;

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

export async function fetchFoodPhoto(query: string): Promise<string | null> {
  return searchUnsplash(query + ' mediterranean food dish plated');
}

export async function fetchSceneryPhoto(query: string): Promise<string | null> {
  return searchUnsplash(query);
}
