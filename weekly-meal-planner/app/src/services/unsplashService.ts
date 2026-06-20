const UNSPLASH_BASE = 'https://api.unsplash.com';

function loremFlickrUrl(query: string, width: number, height: number): string {
  const keywords = query
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(',');
  return `https://loremflickr.com/${width}/${height}/${encodeURIComponent(keywords)}`;
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
    return loremFlickrUrl(query, fallbackWidth, fallbackHeight);
  }

  try {
    const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=1&orientation=${orientation}&content_filter=high`;

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) return loremFlickrUrl(query, fallbackWidth, fallbackHeight);

    const data = await res.json();
    return data.results?.[0]?.urls?.regular ?? loremFlickrUrl(query, fallbackWidth, fallbackHeight);
  } catch {
    return loremFlickrUrl(query, fallbackWidth, fallbackHeight);
  }
}

export async function fetchFoodPhoto(query: string): Promise<string | null> {
  return searchUnsplash(`${query} food dish`, 'squarish', 800, 800);
}

export async function fetchSceneryPhoto(query: string): Promise<string | null> {
  return searchUnsplash(query, 'landscape', 1200, 600);
}
