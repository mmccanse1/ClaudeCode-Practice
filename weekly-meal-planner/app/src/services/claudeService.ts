import { Recipe, DietType } from '../types';

export const RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR';
export const AI_PARSE_ERROR = 'AI_PARSE_ERROR';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(parts: object[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set');

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
  } catch {
    throw new Error('No internet connection. Please check your connection and try again.');
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(RATE_LIMIT_ERROR);
    }
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
    throw new Error(AI_PARSE_ERROR);
  }
}

const RECIPE_SHAPE = `[
  {
    "name": "string",
    "description": "string (1-2 sentences)",
    "day": "Monday",
    "prepTime": "string e.g. 15 mins",
    "cookTime": "string e.g. 25 mins",
    "servings": 4,
    "ingredients": ["quantity + ingredient"],
    "steps": ["Full sentence step."],
    "nutritionNotes": "string (1 sentence about why this recipe fits the diet)",
    "searchQuery": "concise food photo search term"
  }
]`;

function buildSystemPrompt(dietType: DietType, glutenFree: boolean): string {
  const gfNote = glutenFree
    ? '\n\nCRITICAL: ALL recipes must be completely GLUTEN-FREE. No wheat, barley, rye, spelt, or standard flour. Use rice, quinoa, buckwheat, almond flour, or naturally gluten-free ingredients only. Double-check every single ingredient.'
    : '';

  switch (dietType) {
    case 'mediterranean':
      return `You are a Mediterranean diet nutritionist following Mayo Clinic guidelines.

Diet principles:
- Emphasise vegetables, fruits, whole grains, legumes, nuts
- Use olive oil as the main fat
- Include fish or seafood at least twice a week (vary the fish — cod, sea bass, tuna, shrimp, sardines, etc.)
- Limit red meat to a few times per month
- Moderate dairy (mainly cheese and yoghurt)

Strict variety rules:
- Salmon may appear in AT MOST 1 recipe. Prefer other fish.
- Do NOT use zucchini (courgette) or yellow squash.
- No single protein source more than twice across the week.${gfNote}`;

    case 'keto':
      return `You are a ketogenic diet nutritionist specializing in low-carb high-fat meal planning.

Diet principles:
- Very low carbohydrate (target under 20g net carbs per serving)
- High fat: butter, olive oil, avocado oil, coconut oil, heavy cream, cheese, bacon fat
- Moderate protein: beef, pork, chicken, lamb, fish, eggs
- Only non-starchy vegetables: leafy greens, broccoli, cauliflower, asparagus, mushrooms, bell peppers, cucumbers, spinach
- ABSOLUTELY AVOID: grains, bread, pasta, rice, oats, legumes, beans, sugar, honey, fruit juice, starchy vegetables (potatoes, corn, peas, carrots)
- Small amounts of berries are acceptable

Strict variety rules:
- No single protein source more than twice across the week
- Include at least 2 fish or seafood dishes
- Include at least 1 egg-based dish${gfNote}`;

    case 'paleo':
      return `You are a Paleo diet nutritionist focused on ancestral whole-food eating.

Diet principles:
- Eat what early humans could hunt or gather: meat, fish, eggs, vegetables, fruits, nuts, seeds
- Cooking fats: animal fats (lard, tallow, duck fat), coconut oil, avocado oil, olive oil
- AVOID all: grains (wheat, rice, oats, corn), dairy, legumes (beans, lentils, peanuts), refined sugar, processed foods, industrial seed oils
- Emphasise quality meat, wild-caught fish, organic vegetables
- Sweet potatoes, cassava, and plantains are permitted as starchy carb sources
- Fruits and berries are permitted

Strict variety rules:
- Vary proteins: beef, pork, chicken, turkey, fish, lamb — no single protein more than twice
- Include at least 2 fish or seafood dishes
- Include vegetables abundantly at every meal${gfNote}`;

    case 'vegetarian':
      return `You are a vegetarian diet nutritionist focused on balanced, satisfying plant-forward meals.

Diet principles:
- No meat, poultry, or fish — eggs and dairy are fully permitted
- Ensure complete proteins: combine legumes + grains, use eggs + cheese, or tofu with varied vegetables
- Protein sources: eggs, cheese, Greek yoghurt, tofu, tempeh, beans, lentils, chickpeas, nuts, seeds
- Cooking fats: olive oil, butter, ghee
- Include whole grains: rice, farro, barley, quinoa, pasta
- Abundant and varied vegetables and seasonal produce

Strict variety rules:
- At least 3 legume-based main dishes across the week
- At least 2 egg-based dishes
- Do not use the same grain base more than twice
- No single protein source more than twice${gfNote}`;

    case 'vegan':
      return `You are a vegan diet nutritionist ensuring nutritionally complete, delicious plant-based meals.

Diet principles:
- No animal products: no meat, fish, eggs, dairy, honey, or gelatin
- Build complete amino acid profiles: combine legumes with grains, or use tofu/tempeh/edamame
- Protein sources: tofu, tempeh, edamame, lentils, black beans, chickpeas, kidney beans, seitan, nutritional yeast, quinoa, hemp seeds
- Healthy fats: avocado, nuts, seeds, coconut, olive oil
- Include iron-rich foods: lentils, tofu, spinach, pumpkin seeds, fortified grains
- Mention B12 sources in nutrition notes where relevant (nutritional yeast, fortified foods)

Strict variety rules:
- At least 3 legume-based main dishes across the week
- At least 2 tofu or tempeh dishes
- Vary cuisine styles for interest across the week
- No single protein source more than twice${gfNote}`;
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

export async function regenerateRecipe(
  ingredients: string[],
  existingRecipes: Recipe[],
  dayToReplace: string,
  dietType: DietType = 'mediterranean',
  glutenFree: boolean = false
): Promise<Recipe> {
  const systemPrompt = buildSystemPrompt(dietType, glutenFree);
  const otherRecipes = existingRecipes
    .filter(r => r.day !== dayToReplace)
    .map(r => `${r.day}: ${r.name}`)
    .join(', ');

  const text = await callGemini([
    {
      text: `${systemPrompt}

Available ingredients: ${ingredients.join(', ')}
You may also use common pantry staples (salt, pepper, olive oil, garlic, lemon, herbs, spices).

Generate exactly 1 new recipe for ${dayToReplace}.

The rest of the weekly menu is already set — do NOT duplicate any of these:
${otherRecipes}

The new recipe must be completely different from all listed above.

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

export async function generateMealPlan(
  ingredients: string[],
  dietType: DietType = 'mediterranean',
  glutenFree: boolean = false
): Promise<Recipe[]> {
  const systemPrompt = buildSystemPrompt(dietType, glutenFree);

  const text = await callGemini([
    {
      text: `${systemPrompt}

Available ingredients: ${ingredients.join(', ')}
You may also use common pantry staples (salt, pepper, olive oil, garlic, lemon, herbs, spices).

Generate exactly 7 recipes, one per day (Monday–Sunday). Each recipe must primarily use ingredients from the available list above.

Return ONLY a valid JSON array of 7 objects with this exact shape:
${RECIPE_SHAPE}`,
    },
  ]);

  return extractJson<Recipe[]>(text);
}
