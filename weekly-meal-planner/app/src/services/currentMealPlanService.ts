import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, DietType } from '../types';

const LEGACY_KEY = '@meal_planner_current_plan';
const HAS_GENERATED_KEY = '@meal_planner_has_generated';
const CELEBRATED_DIETS_KEY = '@meal_planner_celebrated_diets';
const ALL_DIET_TYPES: DietType[] = ['mediterranean', 'keto', 'paleo', 'vegetarian', 'vegan'];

function dietKey(diet: DietType): string {
  return `@meal_planner_current_plan_${diet}`;
}

interface StoredPlan {
  recipes: Recipe[];
  ingredients: string[];
  createdAt: string;
  expiresAt: string;
  dietType: DietType;
}

export interface CurrentPlan {
  recipes: Recipe[];
  ingredients: string[];
  daysRemaining: number;
  createdAt: Date;
  dietType: DietType;
}

export async function saveCurrentMealPlan(
  recipes: Recipe[],
  ingredients: string[],
  dietType: DietType = 'mediterranean'
): Promise<void> {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const plan: StoredPlan = { recipes, ingredients, createdAt, expiresAt, dietType };
  await AsyncStorage.setItem(dietKey(dietType), JSON.stringify(plan));
  // Mark that the user has completed at least one plan. Persists even after the
  // plan expires, so premium diets stay unlocked once the first "aha" is earned.
  await AsyncStorage.setItem(HAS_GENERATED_KEY, 'true');
}

/**
 * True once the user has generated at least one meal plan. Used to defer the
 * premium upsell until after the first value moment.
 */
export async function hasEverGeneratedPlan(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HAS_GENERATED_KEY)) === 'true';
  } catch {
    return false;
  }
}

async function getCelebratedDiets(): Promise<DietType[]> {
  try {
    const json = await AsyncStorage.getItem(CELEBRATED_DIETS_KEY);
    const parsed = json ? JSON.parse(json) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** True if the user has already seen the first-menu celebration for this diet. */
export async function hasCelebratedDiet(dietType: DietType): Promise<boolean> {
  return (await getCelebratedDiets()).includes(dietType);
}

/** Records that the first-menu celebration for this diet has been shown. */
export async function markDietCelebrated(dietType: DietType): Promise<void> {
  const celebrated = await getCelebratedDiets();
  if (celebrated.includes(dietType)) return;
  await AsyncStorage.setItem(CELEBRATED_DIETS_KEY, JSON.stringify([...celebrated, dietType]));
}

export async function getCurrentMealPlan(dietType: DietType = 'mediterranean'): Promise<CurrentPlan | null> {
  try {
    let json = await AsyncStorage.getItem(dietKey(dietType));
    if (!json && dietType === 'mediterranean') {
      json = await AsyncStorage.getItem(LEGACY_KEY);
    }
    if (!json) return null;

    const plan: StoredPlan = JSON.parse(json);
    const now = new Date();
    const expiresAt = new Date(plan.expiresAt);

    if (now > expiresAt) {
      await AsyncStorage.removeItem(dietKey(dietType));
      return null;
    }

    const msRemaining = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

    return {
      recipes: plan.recipes,
      ingredients: plan.ingredients,
      daysRemaining,
      createdAt: new Date(plan.createdAt),
      dietType: plan.dietType ?? 'mediterranean',
    };
  } catch {
    return null;
  }
}

export async function getAllCurrentPlans(): Promise<CurrentPlan[]> {
  const plans = await Promise.all(ALL_DIET_TYPES.map(d => getCurrentMealPlan(d)));
  return plans.filter((p): p is CurrentPlan => p !== null);
}

export async function clearCurrentMealPlan(dietType: DietType = 'mediterranean'): Promise<void> {
  await AsyncStorage.removeItem(dietKey(dietType));
  if (dietType === 'mediterranean') {
    await AsyncStorage.removeItem(LEGACY_KEY);
  }
}
