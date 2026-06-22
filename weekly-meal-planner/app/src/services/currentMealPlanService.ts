import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types';

const KEY = '@meal_planner_current_plan';

interface StoredPlan {
  recipes: Recipe[];
  ingredients: string[];
  createdAt: string;
  expiresAt: string;
}

export interface CurrentPlan {
  recipes: Recipe[];
  ingredients: string[];
  daysRemaining: number;
  createdAt: Date;
}

export async function saveCurrentMealPlan(
  recipes: Recipe[],
  ingredients: string[]
): Promise<void> {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const plan: StoredPlan = { recipes, ingredients, createdAt, expiresAt };
  await AsyncStorage.setItem(KEY, JSON.stringify(plan));
}

export async function getCurrentMealPlan(): Promise<CurrentPlan | null> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    if (!json) return null;

    const plan: StoredPlan = JSON.parse(json);
    const now = new Date();
    const expiresAt = new Date(plan.expiresAt);

    if (now > expiresAt) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }

    const msRemaining = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

    return {
      recipes: plan.recipes,
      ingredients: plan.ingredients,
      daysRemaining,
      createdAt: new Date(plan.createdAt),
    };
  } catch {
    return null;
  }
}

export async function clearCurrentMealPlan(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
