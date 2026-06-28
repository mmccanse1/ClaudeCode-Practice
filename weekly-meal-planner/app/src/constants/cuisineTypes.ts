import { CuisineType } from '../types';

export interface CuisineMeta {
  id: CuisineType;
  label: string;
  emoji: string;
}

/** Cuisine picker options (Pro). Order is the display order on the selector.
 *  "No preference" isn't an entry — it's the absence of a selection (undefined). */
export const CUISINE_TYPES: CuisineMeta[] = [
  { id: 'indian', label: 'Indian', emoji: '🍛' },
  { id: 'east_asian', label: 'East Asian', emoji: '🥢' },
  { id: 'middle_eastern', label: 'Middle Eastern', emoji: '🥙' },
  { id: 'latin_american', label: 'Latin American', emoji: '🌮' },
  { id: 'classic_american', label: 'Home-Style', emoji: '🍗' },
];

/** Meta for a cuisine id, or undefined for "no preference". */
export function cuisineMeta(id?: CuisineType): CuisineMeta | undefined {
  return id ? CUISINE_TYPES.find(c => c.id === id) : undefined;
}
