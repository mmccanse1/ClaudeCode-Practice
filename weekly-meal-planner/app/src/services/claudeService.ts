import { Recipe } from '../types';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1/models';

async function callGemini(parts: object[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set');

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text as string;
}

function extractJson<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse JSON from Gemini response');
  }
}

export async function parseReceiptFromImage(base64: string, mimeType: string = 'image/jpeg'): Promise<string[]> {
  const text = await callGemini([
    { inline_data: { mime_type: mimeType, data: base64 } },
    {
      text: 'This is a grocery receipt. Extract every food item and ingredient. Return ONLY a JSON array of strings. Example: ["chicken breast","olive oil","tomatoes"]. No extra text.',
    },
  ]);

  return extractJson<string[]>(text);
}

export async function generateMealPlan(ingredients: string[]): Promise<Recipe[]> {
  const text = await callGemini([
    {
      text: `You are a Mediterranean diet nutritionist following Mayo Clinic guidelines.

Available ingredients: ${ingredients.join(', ')}

You may also use common pantry staples (salt, pepper, olive oil, garlic, lemon, herbs).

Generate exactly 7 Mediterranean diet recipes, one per day (Monday–Sunday). Each recipe must primarily use ingredients from the list above.

Mayo Clinic Mediterranean diet principles to follow:
- Emphasise vegetables, fruits, whole grains, legumes, nuts
- Use olive oil as the main fat
- Include fish or seafood at least twice a week (vary the fish — cod, sea bass, tuna, shrimp, sardines, etc.)
- Limit red meat to a few times per month
- Moderate dairy (mainly cheese and yoghurt)

STRICT variety rules — follow these exactly:
- Salmon may appear in AT MOST 1 of the 7 recipes. Prefer other fish varieties.
- Do NOT use zucchini (courgette) or yellow squash in any recipe. Use other vegetables instead.
- Vary proteins across the week: no single protein source should appear more than twice.

Return ONLY a valid JSON array of 7 objects with this exact shape:
[
  {
    "name": "string",
    "description": "string (1-2 sentences)",
    "day": "Monday",
    "prepTime": "string e.g. 15 mins",
    "cookTime": "string e.g. 25 mins",
    "servings": 4,
    "ingredients": ["quantity + ingredient"],
    "steps": ["Full sentence step."],
    "nutritionNotes": "string (1 sentence Mediterranean benefit)",
    "searchQuery": "concise food photo search term"
  }
]`,
    },
  ]);

  return extractJson<Recipe[]>(text);
}
