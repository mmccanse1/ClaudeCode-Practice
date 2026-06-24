import { Recipe, DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_BASE = 'https://api.anthropic.com/v1/messages';

async function callClaude(parts: object[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');

  const response = await fetch(CLAUDE_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: parts }],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit reached. Please wait 60 seconds and try again.');
    }
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

export async function parseReceiptFromImage(base64: string, mimeType: string = 'image/jpeg'): Promise<string[]> {
  const normalizedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
    ? mimeType
    : 'image/jpeg';

  const text = await callClaude([
    {
      type: 'image',
      source: { type: 'base64', media_type: normalizedMime, data: base64 },
    },
    {
      type: 'text',
      text: 'This is a grocery receipt. Extract every food item and ingredient. Return ONLY a JSON array of strings. Example: ["chicken breast","olive oil","tomatoes"]. No extra text.',
    },
  ]);

  return extractJson<string[]>(text);
}

export async function regenerateRecipe(
  ingredients: string[],
  existingRecipes: Recipe[],
  dayToReplace: string,
  dietType: DietType = 'mediterranean'
): Promise<Recipe> {
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const otherRecipes = existingRecipes
    .filter(r => r.day !== dayToReplace)
    .map(r => `${r.day}: ${r.name}`)
    .join(', ');

  const salmonAlreadyUsed = existingRecipes
    .filter(r => r.day !== dayToReplace)
    .some(r => r.name.toLowerCase().includes('salmon') ||
               r.ingredients?.some(i => i.toLowerCase().includes('salmon')));

  const text = await callClaude([
    {
      type: 'text',
      text: `You are a ${dietConfig.label} diet expert. ${dietConfig.promptGuidelines}

Available ingredients: ${ingredients.join(', ')}
You may also use common pantry staples (salt, pepper, olive oil, garlic, lemon, herbs).

Generate exactly 1 new ${dietConfig.label} diet recipe for ${dayToReplace}.

The rest of the weekly menu is already set — do NOT duplicate any of these:
${otherRecipes}

STRICT rules:
- ${salmonAlreadyUsed ? 'Do NOT use salmon — it already appears elsewhere in the week.' : 'Salmon may appear only if it has not been used elsewhere this week.'}
- Must be different from all the recipes listed above.

Return ONLY a valid JSON object (not an array) with this exact shape:
{
  "name": "string",
  "description": "string (1-2 sentences)",
  "day": "${dayToReplace}",
  "prepTime": "string e.g. 15 mins",
  "cookTime": "string e.g. 25 mins",
  "servings": 4,
  "ingredients": ["quantity + ingredient"],
  "steps": ["Full sentence step."],
  "nutritionNotes": "string (1 sentence diet benefit)",
  "searchQuery": "concise food photo search term"
}`,
    },
  ]);

  return extractJson<Recipe>(text);
}

export async function generateMealPlan(ingredients: string[], dietType: DietType = 'mediterranean'): Promise<Recipe[]> {
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const text = await callClaude([
    {
      type: 'text',
      text: `You are a ${dietConfig.label} diet expert. ${dietConfig.promptGuidelines}

Available ingredients: ${ingredients.join(', ')}

You may also use common pantry staples (salt, pepper, olive oil, garlic, lemon, herbs).

Generate exactly 7 ${dietConfig.label} diet recipes, one per day (Monday–Sunday). Each recipe must primarily use ingredients from the list above.

STRICT variety rules — follow these exactly:
- Vary proteins across the week: no single protein source should appear more than twice.
- Each recipe must be distinct — no repeated dishes.

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
    "nutritionNotes": "string (1 sentence diet benefit)",
    "searchQuery": "concise food photo search term"
  }
]`,
    },
  ]);

  return extractJson<Recipe[]>(text);
}
