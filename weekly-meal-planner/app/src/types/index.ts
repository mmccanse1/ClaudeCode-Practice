/** Estimated per-serving nutrition. All values are numbers in fixed units:
 *  calories = kcal, protein/carbs/fat/sugar = grams, sodium = milligrams. */
export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
}

/** Premium detailed nutrition (Pro). Estimated per serving; integers in fixed
 *  units: grams except cholesterol/omega3/potassium/calcium/iron/magnesium = mg,
 *  vitaminD/vitaminB12 = mcg. */
export interface NutritionPremium {
  fiber: number;
  netCarbs: number;
  saturatedFat: number;
  addedSugar: number;
  cholesterol: number;
  omega3: number;
  potassium: number;
  calcium: number;
  iron: number;
  magnesium: number;
  vitaminD: number;
  vitaminB12: number;
}

// 'side' is a Pro add-on course, not a main meal slot. It rides the same recipe
// pipeline (generation, cards, detail, regenerate) but generates 5/week (Mon–Fri)
// paired to the week's dinners rather than a full 7. Keep it last so it sorts
// after the three mains everywhere mealType ordering is applied.
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'side';

export interface Recipe {
  name: string;
  description: string;
  day: string;
  /** Optional — older saved recipes predate meal types; treat absence as dinner. */
  mealType?: MealType;
  prepTime: string;
  cookTime: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  nutritionNotes: string;
  /** Optional — older saved recipes predate this and render without it. */
  nutrition?: Nutrition;
  /** Premium detailed nutrition. Only present when generated with Pro enabled. */
  nutritionPremium?: NutritionPremium;
  searchQuery: string;
  photoUrl?: string;
  dietType?: DietType;
  /** Sides only — which dinner this side is meant to complement. Nullable on
   *  every other record type (breakfast/lunch/dinner). */
  pairingNote?: string;
}

export interface MealPlan {
  id: string;
  createdAt: string;
  recipes: Recipe[];
  receiptItems: string[];
  pantryItems: string[];
}

export type DietType = 'mediterranean' | 'keto' | 'paleo' | 'vegetarian' | 'vegan';

// World cuisines (Pro). A cuisine layers ON TOP of a diet: the diet decides WHAT
// can go in, the cuisine decides HOW it's cooked and spiced. `undefined` means no
// cuisine preference (the default — diet-only, unchanged behavior).
export type CuisineType =
  | 'indian'
  | 'east_asian'
  | 'middle_eastern'
  | 'latin_american'
  | 'classic_american';

export type RootStackParamList = {
  Home: undefined;
  ScanReceipt: { dietType: DietType };
  Pantry: undefined;
  PantryShelf: undefined;
  MealPlan: { recipes: Recipe[]; ingredients: string[]; dietType?: DietType; glutenFree?: boolean; lowSalt?: boolean; diabetic?: boolean; cuisine?: CuisineType; pantrySavedCount?: number; saved?: boolean };
  Day: { day: string; recipes: Recipe[]; ingredients: string[]; dietType: DietType; glutenFree?: boolean; lowSalt?: boolean; diabetic?: boolean; cuisine?: CuisineType; saved?: boolean };
  RecipeDetail: { recipe: Recipe; dietType?: DietType };
  SavedRecipes: undefined;
};
