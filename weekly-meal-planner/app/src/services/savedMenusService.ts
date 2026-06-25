import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';

const KEY = '@meal_planner_saved_menus';

export interface SavedMenu {
  id: string;
  name: string;
  savedAt: string;
  recipes: Recipe[];
  ingredients: string[];
  dietType?: DietType;
}

export async function getSavedMenus(): Promise<SavedMenu[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveMenu(
  recipes: Recipe[],
  ingredients: string[],
  dietType: DietType = 'mediterranean'
): Promise<void> {
  const existing = await getSavedMenus();
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const dietLabel = DIET_TYPES.find(d => d.id === dietType)?.label ?? dietType;
  const newMenu: SavedMenu = {
    id: Date.now().toString(),
    name: `${dietLabel} Week of ${date}`,
    savedAt: new Date().toISOString(),
    recipes,
    ingredients,
    dietType,
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([newMenu, ...existing]));
}

export async function deleteMenu(id: string): Promise<void> {
  const existing = await getSavedMenus();
  const updated = existing.filter(m => m.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}
