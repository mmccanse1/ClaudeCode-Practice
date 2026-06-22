import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, DietType } from '../types';

const LEGACY_KEY = '@meal_planner_current_plan';
const ALL_DIET_TYPES: DietType[] = ['mediterranean', 'keto', 'paleo', 'vegetarian', 'vegan'];

function dietKey(diet: DietType): string {
  return `@meal_planner_current_plan_${diet}`;
}

interface StoredPlan {
  recipes: Recipe[];
  ingredients: string[];
  createdAt: string;
  expiresAt: string;
  dietType?: DietType;
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
