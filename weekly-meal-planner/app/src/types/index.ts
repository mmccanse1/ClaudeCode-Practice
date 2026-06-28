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

export type MealType = 'breakfast' | 'lunch' | 'dinner';

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
  searchQuery: string;
  photoUrl?: string;
  dietType?: DietType;
}

export interface MealPlan {
  id: string;
  createdAt: string;
  recipes: Recipe[];
  receiptItems: string[];
  pantryItems: string[];
}

export type DietType = 'mediterranean' | 'keto' | 'paleo' | 'vegetarian' | 'vegan';

export type RootStackParamList = {
  Home: undefined;
  ScanReceipt: { dietType: DietType };
  Pantry: undefined;
  PantryShelf: undefined;
  MealPlan: { recipes: Recipe[]; ingredients: string[]; dietType?: DietType; glutenFree?: boolean; lowSalt?: boolean; diabetic?: boolean; pantrySavedCount?: number; saved?: boolean };
  Day: { day: string; recipes: Recipe[]; ingredients: string[]; dietType: DietType; glutenFree?: boolean; lowSalt?: boolean; diabetic?: boolean; saved?: boolean };
  RecipeDetail: { recipe: Recipe; dietType?: DietType };
  SavedRecipes: undefined;
};
