import { Recipe, DietType, MealType } from '../types';

export const RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR';
export const AI_PARSE_ERROR = 'AI_PARSE_ERROR';

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

interface CallOpts {
  signal?: AbortSignal;
  /** Wall-clock cap before aborting. Defaults to 20s (fine for short calls). */
  timeoutMs?: number;
  /** Max output tokens. Defaults to 4096. */
  maxTokens?: number;
}

async function callClaude(parts: object[], opts: CallOpts = {}): Promise<string> {
  const { signal, timeoutMs = 20_000, maxTokens = 4096 } = opts;
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort());

  let response: Response;
  try {
    response = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: parts }],
      }),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw new Error('No internet connection. Please check your connection and try again.');
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(RATE_LIMIT_ERROR);
    }
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') throw new Error(AI_PARSE_ERROR);
  return text;
}

const PROTEIN_KEYWORDS = [
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'venison', 'rabbit',
  'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'shrimp', 'prawn', 'crab',
  'lobster', 'scallop', 'sardine', 'anchovy', 'bass', 'trout', 'mahi', 'fish', 'seafood',
  'egg', 'tofu', 'tempeh', 'seitan', 'edamame',
  'lentil', 'chickpea', 'bean', 'legume', 'pea',
  'sausage', 'bacon', 'ham', 'steak', 'ground beef', 'ground turkey', 'ground pork',
  'mince', 'meat', 'poultry',
];

function extractProteins(ingredients: string[]): string[] {
  return ingredients.filter(ing =>
    PROTEIN_KEYWORDS.some(kw => ing.toLowerCase().includes(kw))
  );
}

function buildProteinConstraint(ingredients: string[]): string {
  const proteins = extractProteins(ingredients);
  if (proteins.length > 0) {
    return `PROTEINS AVAILABLE (the ONLY proteins you may use): ${proteins.join(', ')}
Do NOT introduce any other meat, poultry, fish, seafood, eggs, tofu, or legumes — even if they would be a natural fit for this diet. If a protein is not in this list, it is not in the kitchen.`;
  }
  return `No animal proteins are in the pantry. Use only plant-based proteins visible in the ingredient list above (legumes, tofu, tempeh, edamame, nuts, seeds). Do not introduce any meat, poultry, or fish.`;
}

function extractJson<T>(text: string): T {
  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const match = stripped.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) return JSON.parse(match[0]);
    throw new Error(AI_PARSE_ERROR);
  }
}

// Per-serving nutrition estimate. Units are fixed so the UI can label them.
const NUTRITION_INSTRUCTION = `For "nutrition", give realistic PER-SERVING estimates as integers:
- calories in kcal, protein/carbs/sugar in grams, sodium in milligrams.
These are estimates for general guidance only — they do not need lab precision, but should be plausible for the ingredients and serving size.`;

const NUTRITION_SHAPE = `"nutrition": { "calories": 520, "protein": 32, "carbs": 18, "sugar": 6, "sodium": 640 }`;

// Frames a 7-recipe generation as a specific meal of the day.
const MEAL_DIRECTIVE: Record<MealType, string> = {
  breakfast: 'These are BREAKFAST recipes — breakfast-appropriate dishes (eggs, oats, smoothies, yoghurt bowls, savoury breakfasts, etc.) that still fit the diet.',
  lunch: 'These are LUNCH recipes — lighter midday meals (salads, grain bowls, wraps, soups, etc.) that still fit the diet.',
  dinner: 'These are DINNER recipes — satisfying evening main dishes that fit the diet.',
};

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
};

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
    ${NUTRITION_SHAPE},
    "searchQuery": "concise food photo search term"
  }
]`;

// Coerce a model-supplied nutrition object to clean integers, or drop it.
// Returns undefined if the data is missing/garbage so the recipe still renders.
function normalizeNutrition(raw: any): Recipe['nutrition'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const num = (v: any): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const calories = num(raw.calories);
  const protein = num(raw.protein);
  const carbs = num(raw.carbs);
  const sugar = num(raw.sugar);
  const sodium = num(raw.sodium);
  if (calories === null || protein === null || carbs === null || sugar === null || sodium === null) {
    return undefined;
  }
  return { calories, protein, carbs, sugar, sodium };
}

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

    default:
      throw new Error(`Unknown diet type: ${dietType as string}`);
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

  const result = extractJson<string[]>(text);
  if (!Array.isArray(result)) throw new Error(AI_PARSE_ERROR);
  return result.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export async function regenerateRecipe(
  ingredients: string[],
  existingRecipes: Recipe[],
  dayToReplace: string,
  dietType: DietType = 'mediterranean',
  glutenFree: boolean = false,
  mealType: MealType = 'dinner'
): Promise<Recipe> {
  const systemPrompt = buildSystemPrompt(dietType, glutenFree);
  // The recipe being replaced is the one matching BOTH day and meal type.
  const isTarget = (r: Recipe) =>
    r.day === dayToReplace && (r.mealType ?? 'dinner') === mealType;
  const others = existingRecipes.filter(r => !isTarget(r));

  const otherRecipes = others
    .map(r => `${r.day} ${MEAL_LABEL[r.mealType ?? 'dinner']}: ${r.name}`)
    .join(', ');

  const salmonAlreadyUsed = others.some(
    r => r.name.toLowerCase().includes('salmon') ||
         r.ingredients?.some(i => i.toLowerCase().includes('salmon'))
  );

  const proteinConstraint = buildProteinConstraint(ingredients);

  const text = await callClaude([
    {
      type: 'text',
      text: `${systemPrompt}

Available ingredients: ${ingredients.join(', ')}
You may also use common pantry staples (salt, pepper, olive oil, garlic, lemon, herbs, and basic spices).
${proteinConstraint}

Generate exactly 1 new ${MEAL_LABEL[mealType]} recipe for ${dayToReplace}. ${MEAL_DIRECTIVE[mealType]}

The rest of the weekly menu is already set — do NOT duplicate any of these:
${otherRecipes}

STRICT rules:
- ${salmonAlreadyUsed ? 'Do NOT use salmon — it already appears elsewhere in the week.' : 'Salmon may appear only if it has not been used elsewhere this week.'}
- Must be different from all the recipes listed above.

${NUTRITION_INSTRUCTION}

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
  ${NUTRITION_SHAPE},
  "searchQuery": "concise food photo search term"
}`,
    },
  ], { timeoutMs: 45_000 });

  const recipe = extractJson<Recipe>(text);
  if (!recipe || typeof recipe !== 'object' || !recipe.day || typeof recipe.day !== 'string' || !recipe.name) {
    throw new Error(AI_PARSE_ERROR);
  }
  return { ...recipe, mealType, nutrition: normalizeNutrition(recipe.nutrition) };
}

// Generates the 7 day-recipes for a single meal type, tagged with that meal.
async function generateMealForType(
  ingredients: string[],
  dietType: DietType,
  glutenFree: boolean,
  mealType: MealType
): Promise<Recipe[]> {
  const systemPrompt = buildSystemPrompt(dietType, glutenFree);
  const proteinConstraint = buildProteinConstraint(ingredients);

  const text = await callClaude([
    {
      type: 'text',
      text: `${systemPrompt}

Available ingredients: ${ingredients.join(', ')}
You may also use common pantry staples (salt, pepper, olive oil, garlic, lemon, herbs, and basic spices).
${proteinConstraint}

Generate exactly 7 ${MEAL_LABEL[mealType]} recipes, one per day (Monday–Sunday). ${MEAL_DIRECTIVE[mealType]} Each recipe must primarily use ingredients from the list above.

STRICT variety rules — follow these exactly:
- Vary proteins across the week: no single protein source should appear more than twice.
- Each recipe must be distinct — no repeated dishes.

${NUTRITION_INSTRUCTION}

Return ONLY a valid JSON array of 7 objects with this exact shape:
${RECIPE_SHAPE}`,
    },
  ], { timeoutMs: 60_000, maxTokens: 8192 });

  const parsed = extractJson<Recipe[]>(text);
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 7 ||
    parsed.some(r => !r.day || typeof r.day !== 'string')
  ) {
    throw new Error(AI_PARSE_ERROR);
  }
  return parsed.map(r => ({ ...r, mealType, nutrition: normalizeNutrition(r.nutrition) }));
}

export async function generateMealPlan(
  ingredients: string[],
  dietType: DietType = 'mediterranean',
  glutenFree: boolean = false,
  meals: MealType[] = ['dinner']
): Promise<Recipe[]> {
  // Only generate the meals the user asked for — one model call per meal type,
  // run in parallel. A flat list of all (day × meal) recipes comes back.
  const selected: MealType[] = meals.length > 0 ? meals : ['dinner'];
  const perMeal = await Promise.all(
    selected.map(meal => generateMealForType(ingredients, dietType, glutenFree, meal))
  );
  return perMeal.flat();
}
