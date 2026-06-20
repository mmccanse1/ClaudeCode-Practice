const UNSPLASH_BASE = 'https://api.unsplash.com';

function picsumUrl(seed: string, width: number, height: number): string {
  const clean = seed.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 40);
  return `https://picsum.photos/seed/${clean}/${width}/${height}`;
}

async function searchUnsplash(
  query: string,
  orientation: 'landscape' | 'squarish' = 'landscape',
  fallbackWidth = 800,
  fallbackHeight = 600
): Promise<string | null> {
  const accessKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
  const hasValidKey = accessKey && accessKey !== 'your_unsplash_access_key_here';

  if (!hasValidKey) {
    return picsumUrl(query, fallbackWidth, fallbackHeight);
  }

  try {
    const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=1&orientation=${orientation}&content_filter=high`;

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) return picsumUrl(query, fallbackWidth, fallbackHeight);

    const data = await res.json();
    return data.results?.[0]?.urls?.regular ?? picsumUrl(query, fallbackWidth, fallbackHeight);
  } catch {
    return picsumUrl(query, fallbackWidth, fallbackHeight);
  }
}

export async function fetchFoodPhoto(query: string): Promise<string | null> {
  return searchUnsplash(query + ' mediterranean food dish plated', 'squarish', 800, 800);
}

export async function fetchSceneryPhoto(query: string): Promise<string | null> {
  return searchUnsplash(query, 'landscape', 1200, 600);
}
