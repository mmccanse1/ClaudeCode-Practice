import { MealType } from '../types';

export interface MealMeta {
  id: MealType;
  label: string;
  emoji: string;
}

/** The three main meal slots — drives the meal-picker grid and the generation
 *  loop. Display order is breakfast → lunch → dinner everywhere in the app. */
export const MEAL_TYPES: MealMeta[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch', label: 'Lunch', emoji: '🥗' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽' },
];

// Sides are a Pro add-on course, not a main meal, so they're kept out of
// MEAL_TYPES (the picker grid + generate loop) and only join the label/sort
// lookups below. Label is singular because it tags one card at a time.
export const SIDE_META: MealMeta = { id: 'side', label: 'Side', emoji: '🥔' };

const ALL_META: MealMeta[] = [...MEAL_TYPES, SIDE_META];

const ORDER: Record<MealType, number> = { breakfast: 0, lunch: 1, dinner: 2, side: 3 };

/** Meta for a meal type. Falls back to dinner for legacy recipes with no mealType. */
export function mealMeta(id?: MealType): MealMeta {
  return ALL_META.find(m => m.id === id) ?? MEAL_TYPES[2];
}

/** Sort recipes (or anything carrying a mealType) into breakfast→lunch→dinner order. */
export function sortByMeal<T extends { mealType?: MealType }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => ORDER[a.mealType ?? 'dinner'] - ORDER[b.mealType ?? 'dinner']
  );
}
