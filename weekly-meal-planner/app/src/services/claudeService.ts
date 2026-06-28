import { Recipe, DietType, MealType } from '../types';
import { IS_PREMIUM } from '../constants/subscription';

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

// Meat/poultry/fish/seafood keywords — the subset of PROTEIN_KEYWORDS that is
// forbidden on plant-based diets. Used to filter the "available proteins" list
// so a shared-household receipt's chicken never gets offered to a vegan menu.
const MEAT_SEAFOOD_KEYWORDS = [
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'venison', 'rabbit',
  'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'shrimp', 'prawn', 'crab',
  'lobster', 'scallop', 'sardine', 'anchovy', 'bass', 'trout', 'mahi', 'fish', 'seafood',
  'sausage', 'bacon', 'ham', 'steak', 'ground beef', 'ground turkey', 'ground pork',
  'mince', 'meat', 'poultry',
];

function isMeatOrSeafood(ingredient: string): boolean {
  const lower = ingredient.toLowerCase();
  return MEAT_SEAFOOD_KEYWORDS.some(kw => lower.includes(kw));
}

function extractProteins(ingredients: string[]): string[] {
  return ingredients.filter(ing =>
    PROTEIN_KEYWORDS.some(kw => ing.toLowerCase().includes(kw))
  );
}

// Restrict the available-protein list to what the diet actually permits.
// Vegetarian drops meat/poultry/fish/seafood (keeps eggs, tofu, legumes);
// vegan additionally drops eggs. Other diets keep everything available.
function allowedProteinsForDiet(proteins: string[], dietType: DietType): string[] {
  if (dietType === 'vegan') {
    return proteins.filter(p => !isMeatOrSeafood(p) && !p.toLowerCase().includes('egg'));
  }
  if (dietType === 'vegetarian') {
    return proteins.filter(p => !isMeatOrSeafood(p));
  }
  return proteins;
}

function buildProteinConstraint(ingredients: string[], dietType: DietType): string {
  const proteins = allowedProteinsForDiet(extractProteins(ingredients), dietType);
  if (proteins.length > 0) {
    return `PROTEINS AVAILABLE (the ONLY proteins you may use): ${proteins.join(', ')}
Do NOT introduce any other meat, poultry, fish, seafood, eggs, tofu, or legumes — even if they would be a natural fit for this diet. If a protein is not in this list, it is not in the kitchen.`;
  }
  // No diet-appropriate proteins were found in the pantry. For plant-based diets
  // this is the common case when the only meats present belong to other members
  // of the household — fall back to plant proteins rather than offering the meat.
  if (dietType === 'vegan' || dietType === 'vegetarian') {
    return `The pantry has no ${dietType}-appropriate protein, so build meals around plant proteins suited to this diet (legumes, beans, lentils, chickpeas, tofu, tempeh, edamame, nuts, seeds${dietType === 'vegetarian' ? ', eggs, dairy' : ''}). Do NOT use any meat, poultry, fish, or seafood, even if it appears in the ingredient list — it is not for this menu.`;
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
- calories in kcal, protein/carbs/fat/sugar in grams, sodium in milligrams.
These are estimates for general guidance only — they do not need lab precision, but should be plausible for the ingredients and serving size.`;

const NUTRITION_SHAPE = `"nutrition": { "calories": 520, "protein": 32, "carbs": 18, "fat": 22, "sugar": 6, "sodium": 640 }`;

// Premium detailed nutrition — only requested when Pro is on, so free
// generations don't pay for the extra tokens. Returned as a SIBLING of "nutrition".
const PREMIUM_NUTRITION_INSTRUCTION = `Because Premium is enabled, ALSO return an expanded "nutrition_premium" object per recipe — all integers, per serving, estimated using USDA FoodData Central conventions:
- fiber (g), net_carbs (g, = carbs minus fiber), saturated_fat (g), added_sugar (g, added during cooking/processing — not naturally occurring), cholesterol (mg), omega_3 (mg), potassium (mg), calcium (mg), iron (mg), magnesium (mg), vitamin_d (mcg), vitamin_b12 (mcg).
If a value is trace or effectively zero, return 0 — never null, never omitted.`;

const PREMIUM_NUTRITION_SHAPE = `"nutrition_premium": { "fiber": 7, "net_carbs": 41, "saturated_fat": 5, "added_sugar": 3, "cholesterol": 85, "omega_3": 240, "potassium": 620, "calcium": 110, "iron": 3, "magnesium": 60, "vitamin_d": 2, "vitamin_b12": 1 }`;

function premiumNutritionBlock(): string {
  if (!IS_PREMIUM) return '';
  return `

${PREMIUM_NUTRITION_INSTRUCTION}
Add it as a sibling key to "nutrition" in every object, exactly this shape:
${PREMIUM_NUTRITION_SHAPE}`;
}

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

// Dinner protein guidance is diet-aware. Meat-allowing diets center a meat or
// seafood protein (eggs are not a valid dinner centerpiece there). Vegetarian
// and vegan are EXEMPT from the meat rule and instead center a diet-appropriate
// protein — otherwise a vegan menu could land chicken on Monday.
function dinnerProteinRule(dietType: DietType): string {
  switch (dietType) {
    case 'vegan':
      return ' Center MOST dinners on a substantial plant protein (tofu, tempeh, seitan, edamame, lentils, beans, chickpeas), varying which one day to day. To keep the week from repeating, a couple of dinners may be vegetable-forward instead — e.g. a hearty dinner salad over greens/lettuce, a roasted-vegetable plate, or a vegetable soup. Do NOT use any meat, poultry, fish, seafood, eggs, or dairy.';
    case 'vegetarian':
      return ' Center MOST dinners on a substantial vegetarian protein (lentils, beans, chickpeas, tofu, tempeh, paneer or other cheese, or eggs), varying which one day to day. To keep the week from repeating, a couple of dinners may be vegetable-forward instead — e.g. a hearty dinner salad, a roasted-vegetable plate, or a vegetable soup. Do NOT use any meat, poultry, fish, or seafood.';
    default:
      return ' Dinners should generally include a meat or seafood protein when the diet allows — aim for most of the week. Eggs are NOT acceptable as the primary dinner protein.';
  }
}

// The meal directive, with the dinner one specialised per diet.
function mealDirective(mealType: MealType, dietType: DietType): string {
  if (mealType === 'dinner') return MEAL_DIRECTIVE.dinner + dinnerProteinRule(dietType);
  return MEAL_DIRECTIVE[mealType];
}

// Low-sodium guidance, injected when the user enables the Low Salt option.
// Grounded in AHA / DASH guidance: target ~1,500 mg sodium/day, season with
// herbs/acids instead of salt, and avoid the processed/canned items that carry
// most dietary sodium. Layered on top of any diet (like the gluten-free option).
const LOW_SALT_NOTE = `

LOW-SODIUM REQUIREMENT (the user has chosen a Low Salt menu — follow strictly):
- Keep each recipe low in sodium: aim for roughly 500 mg sodium or less PER SERVING so a day stays near the 1,500 mg DASH/American Heart Association low-sodium target.
- Do NOT add table salt as a listed ingredient; build flavor with herbs, spices, garlic, onion, citrus/lemon, vinegar, and other aromatics instead.
- Avoid high-sodium and processed ingredients: cured/deli meats, bacon, sausage, canned soups, bouillon/stock cubes, soy sauce, most cheeses, olives, pickles, and jarred sauces. If a canned item (beans, tomatoes) is the only option, call for "no-salt-added" or rinsed.
- Reflect the reduced sodium in the nutrition estimate.`;

// Diabetic-friendly guidance, injected when the user enables the Diabetic option.
// Aligns with general diabetes nutrition guidance: limit added sugar and refined
// carbs, favor fiber + lean protein + healthy fat, keep carbs/sugar per serving
// moderate. Layered on top of any diet (like the gluten-free and low-salt options).
const DIABETIC_NOTE = `

DIABETIC-FRIENDLY REQUIREMENT (the user has chosen a Diabetic-friendly menu — follow strictly):
- Keep each recipe blood-sugar-friendly and lower-glycemic: minimize added sugars and refined carbohydrates (white bread, white rice, sugary sauces, fruit juice, sweets).
- Favor high-fiber, slow-digesting carbs (non-starchy vegetables, legumes, whole/intact grains) and pair carbohydrates with protein and healthy fat.
- Keep total carbohydrate per serving moderate and the sugar estimate low — aim for roughly 10 g of sugar or less per serving where the available ingredients allow.
- Do NOT add sugar, honey, syrup, or sweetened ingredients as listed items; build flavor with spices, herbs, citrus, and aromatics instead.
- Reflect the controlled carbohydrate and reduced sugar in the nutrition estimate.`;

// Weekly ingredient-variety limits for a 7-recipe menu. Deliberately SOFT: the
// app cooks from what the user already bought, so a sparse pantry must still
// generate a full week rather than fail trying to force variety. Tune the
// numeric cap (2 of 7) here — it is the single source of truth.
const WEEKLY_VARIETY_RULES = `STRICT variety rules — apply across the whole week, but NEVER invent ingredients that are not in the available list above:
- No single main ingredient — whether a protein, a main vegetable, or a starch base (rice, potato, pasta, bread, tortilla, etc.) — may headline or be the centerpiece of more than 2 of the 7 recipes.
- Every recipe must be a distinct dish — no repeats — and vary the cooking method and cuisine style from day to day.
- Use ONLY proteins that appear in the available list above — never introduce a protein (or any other ingredient) that is not listed.
- If the available proteins are too few to satisfy the cap, do NOT just repeat the same bean/legume/protein night after night. Break up the week with vegetable-forward dishes built from the available produce — a hearty dinner salad, a roasted-vegetable plate, or a soup — and vary preparations, sauces, and spices.`;

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
  // Core macros (calories, protein, carbs) must be present for the panel to be
  // meaningful. Sugar and sodium are secondary: if the model omits one, default
  // it to 0 rather than discarding the whole nutrition object — a single missing
  // field should never hide the macros (regression observed after Phase 8).
  if (calories === null || protein === null || carbs === null) {
    return undefined;
  }
  const fat = num(raw.fat) ?? 0;
  const sugar = num(raw.sugar) ?? 0;
  const sodium = num(raw.sodium) ?? 0;
  return { calories, protein, carbs, fat, sugar, sodium };
}

// Parse the premium nutrition object (snake_case from the model) into camelCase.
// Missing/trace values default to 0 (spec: never null). Returns undefined when the
// object is absent (free generation or legacy recipe) so the UI shows "unavailable".
function normalizeNutritionPremium(raw: any, freeSugar?: number): Recipe['nutritionPremium'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const num = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  };
  let addedSugar = num(raw.added_sugar);
  if (typeof freeSugar === 'number' && addedSugar > freeSugar) addedSugar = freeSugar;
  return {
    fiber: num(raw.fiber),
    netCarbs: num(raw.net_carbs),
    saturatedFat: num(raw.saturated_fat),
    addedSugar,
    cholesterol: num(raw.cholesterol),
    omega3: num(raw.omega_3),
    potassium: num(raw.potassium),
    calcium: num(raw.calcium),
    iron: num(raw.iron),
    magnesium: num(raw.magnesium),
    vitaminD: num(raw.vitamin_d),
    vitaminB12: num(raw.vitamin_b12),
  };
}

function buildSystemPrompt(dietType: DietType, glutenFree: boolean, lowSalt: boolean = false, diabetic: boolean = false): string {
  const gfNote = (glutenFree
    ? '\n\nCRITICAL: ALL recipes must be completely GLUTEN-FREE. No wheat, barley, rye, spelt, or standard flour. Use rice, quinoa, buckwheat, almond flour, or naturally gluten-free ingredients only. Double-check every single ingredient.'
    : '') + (lowSalt ? LOW_SALT_NOTE : '') + (diabetic ? DIABETIC_NOTE : '');

  switch (dietType) {
    case 'mediterranean':
      return `You are a Mediterranean diet nutritionist following widely recognized Mediterranean diet principles.

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
  mealType: MealType = 'dinner',
  lowSalt: boolean = false,
  diabetic: boolean = false
): Promise<Recipe> {
  const systemPrompt = buildSystemPrompt(dietType, glutenFree, lowSalt, diabetic);
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

  const proteinConstraint = buildProteinConstraint(ingredients, dietType);

  const text = await callClaude([
    {
      type: 'text',
      text: `${systemPrompt}

Available ingredients: ${ingredients.join(', ')}
You may also use common pantry staples (pepper, olive oil, garlic, lemon, herbs, and basic spices).
${proteinConstraint}

Generate exactly 1 new ${MEAL_LABEL[mealType]} recipe for ${dayToReplace}. ${mealDirective(mealType, dietType)}

The rest of the weekly menu is already set — do NOT duplicate any of these:
${otherRecipes}

STRICT rules:
- ${salmonAlreadyUsed ? 'Do NOT use salmon — it already appears elsewhere in the week.' : 'Salmon may appear only if it has not been used elsewhere this week.'}
- Must be different from all the recipes listed above.
- Favor a main protein and centerpiece ingredients that are UNDER-used in the rest of the week — do not pick a protein that already headlines two or more of the recipes listed above, unless the available ingredients leave no alternative.

${NUTRITION_INSTRUCTION}${premiumNutritionBlock()}

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
  const nutrition = normalizeNutrition(recipe.nutrition);
  return {
    ...recipe,
    mealType,
    nutrition,
    nutritionPremium: normalizeNutritionPremium((recipe as any).nutrition_premium, nutrition?.sugar),
  };
}

// Generates the 7 day-recipes for a single meal type, tagged with that meal.
async function generateMealForType(
  ingredients: string[],
  dietType: DietType,
  glutenFree: boolean,
  mealType: MealType,
  lowSalt: boolean = false,
  diabetic: boolean = false
): Promise<Recipe[]> {
  const systemPrompt = buildSystemPrompt(dietType, glutenFree, lowSalt, diabetic);
  const proteinConstraint = buildProteinConstraint(ingredients, dietType);

  const text = await callClaude([
    {
      type: 'text',
      text: `${systemPrompt}

Available ingredients: ${ingredients.join(', ')}
You may also use common pantry staples (pepper, olive oil, garlic, lemon, herbs, and basic spices).
${proteinConstraint}

Generate exactly 7 ${MEAL_LABEL[mealType]} recipes, one per day (Monday–Sunday). ${mealDirective(mealType, dietType)} Each recipe must primarily use ingredients from the list above.

${WEEKLY_VARIETY_RULES}

${NUTRITION_INSTRUCTION}${premiumNutritionBlock()}

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
  return parsed.map(r => {
    const nutrition = normalizeNutrition(r.nutrition);
    return {
      ...r,
      mealType,
      nutrition,
      nutritionPremium: normalizeNutritionPremium((r as any).nutrition_premium, nutrition?.sugar),
    };
  });
}

export async function generateMealPlan(
  ingredients: string[],
  dietType: DietType = 'mediterranean',
  glutenFree: boolean = false,
  meals: MealType[] = ['dinner'],
  lowSalt: boolean = false,
  diabetic: boolean = false
): Promise<Recipe[]> {
  // Only generate the meals the user asked for — one model call per meal type,
  // run in parallel. A flat list of all (day × meal) recipes comes back.
  const selected: MealType[] = meals.length > 0 ? meals : ['dinner'];
  const perMeal = await Promise.all(
    selected.map(meal => generateMealForType(ingredients, dietType, glutenFree, meal, lowSalt, diabetic))
  );
  return perMeal.flat();
}
