import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types';

const KEY = '@meal_planner_saved_recipes';

export async function getSavedRecipes(): Promise<Recipe[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const existing = await getSavedRecipes();
  const isDuplicate = existing.some(r => r.name === recipe.name && r.day === recipe.day);
  if (!isDuplicate) {
    await AsyncStorage.setItem(KEY, JSON.stringify([...existing, recipe]));
  }
}

export async function unsaveRecipe(recipe: Recipe): Promise<void> {
  const existing = await getSavedRecipes();
  const updated = existing.filter(r => !(r.name === recipe.name && r.day === recipe.day));
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

export async function isRecipeSaved(recipe: Recipe): Promise<boolean> {
  const existing = await getSavedRecipes();
  return existing.some(r => r.name === recipe.name && r.day === recipe.day);
}
