export interface Recipe {
  name: string;
  description: string;
  day: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  nutritionNotes: string;
  searchQuery: string;
  photoUrl?: string;
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
  ScanReceipt: undefined;
  Pantry: undefined;
  PantryShelf: undefined;
  MealPlan: { recipes: Recipe[]; ingredients: string[]; dietType?: DietType; pantrySavedCount?: number };
  RecipeDetail: { recipe: Recipe; dietType?: DietType };
  SavedRecipes: undefined;
};
