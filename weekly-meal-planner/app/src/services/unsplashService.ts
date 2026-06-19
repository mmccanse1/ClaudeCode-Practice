const UNSPLASH_BASE = 'https://api.unsplash.com';

export async function fetchFoodPhoto(query: string): Promise<string | null> {
  const accessKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(
      query + ' mediterranean food dish'
    )}&per_page=1&orientation=landscape&content_filter=high`;

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
