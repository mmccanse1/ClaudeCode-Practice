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
