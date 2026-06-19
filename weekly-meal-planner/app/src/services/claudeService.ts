import * as FileSystem from 'expo-file-system';
import { Recipe } from '../types';

const API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(
  messages: object[],
  maxTokens = 2048
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text as string;
}

function extractJson<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse JSON from Claude response');
  }
}

export async function parseReceiptFromImage(imageUri: string): Promise<string[]> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const ext = imageUri.split('.').pop()?.toLowerCase();
  const mediaType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const text = await callClaude(
    [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: 'This is a grocery receipt. Extract every food item and ingredient. Return ONLY a JSON array of strings. Example: ["chicken breast","olive oil","tomatoes"]. No extra text.',
          },
        ],
      },
    ],
    1024
  );

  return extractJson<string[]>(text);
}

export async function generateMealPlan(ingredients: string[]): Promise<Recipe[]> {
  const text = await callClaude(
    [
      {
        role: 'user',
        content: `You are a Mediterranean diet nutritionist following Mayo Clinic guidelines.

Available ingredients: ${ingredients.join(', ')}

You may also use common pantry staples (salt, pepper, olive oil, garlic, lemon, herbs).

Generate exactly 7 Mediterranean diet recipes, one per day (Monday–Sunday). Each recipe must primarily use ingredients from the list above.

Mayo Clinic Mediterranean diet principles to follow:
- Emphasise vegetables, fruits, whole grains, legumes, nuts
- Use olive oil as the main fat
- Include fish or seafood at least twice a week
- Limit red meat to a few times per month
- Moderate dairy (mainly cheese and yoghurt)

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
    ],
    4096
  );

  return extractJson<Recipe[]>(text);
}
