import { MealType } from '../types';

export interface MealMeta {
  id: MealType;
  label: string;
  emoji: string;
}

/** Display order is breakfast → lunch → dinner everywhere in the app. */
export const MEAL_TYPES: MealMeta[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch', label: 'Lunch', emoji: '🥗' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽' },
];

const ORDER: Record<MealType, number> = { breakfast: 0, lunch: 1, dinner: 2 };

/** Meta for a meal type. Falls back to dinner for legacy recipes with no mealType. */
export function mealMeta(id?: MealType): MealMeta {
  return MEAL_TYPES.find(m => m.id === id) ?? MEAL_TYPES[2];
}

/** Sort recipes (or anything carrying a mealType) into breakfast→lunch→dinner order. */
export function sortByMeal<T extends { mealType?: MealType }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => ORDER[a.mealType ?? 'dinner'] - ORDER[b.mealType ?? 'dinner']
  );
}
