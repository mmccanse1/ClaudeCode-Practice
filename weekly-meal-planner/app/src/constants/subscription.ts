import { MealType } from '../types';

// Single source of truth for premium status. Hardcoded false until billing
// (Google Play / App Store IAP) is wired up — THIS is the one seam to replace.
// Launch pricing: $4.99 one-time Pro unlock (see the pricing memory + upgrades/).
// Flip to true to preview the unlocked experience while testing.
export const IS_PREMIUM = false;

// Free tier gets Dinner; Breakfast and Lunch are Pro. (Sides/Desserts, detailed
// macros, and world cuisines are also Pro — gated at their own call sites.)
export const PREMIUM_MEALS: MealType[] = ['breakfast', 'lunch'];

/** True when a meal type is gated behind Pro and the user hasn't unlocked it. */
export function isMealLocked(meal: MealType): boolean {
  return !IS_PREMIUM && PREMIUM_MEALS.includes(meal);
}
