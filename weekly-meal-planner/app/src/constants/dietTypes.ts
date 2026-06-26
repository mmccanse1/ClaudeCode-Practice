import { DietType } from '../types';

export interface DietConfig {
  id: DietType;
  label: string;
  emoji: string;
  tagline: string;
  color: string;
  accentColor: string;
  premium: boolean;
  benefits: string[];
  /** Short credibility line shown on the recipe screen — every diet has one. */
  source: string;
}

export const DIET_TYPES: DietConfig[] = [
  {
    id: 'mediterranean',
    label: 'Mediterranean',
    emoji: '🫒',
    tagline: 'Heart-healthy · Olive oil & fish',
    color: '#2e86ab',
    accentColor: '#e3f3f8',
    premium: false,
    benefits: [],
    source: 'Built on Mayo Clinic’s Mediterranean diet guidelines',
  },
  {
    id: 'keto',
    label: 'Keto',
    emoji: '🥩',
    tagline: 'Low-carb · High-fat',
    color: '#c0392b',
    accentColor: '#fdf0ef',
    premium: true,
    benefits: [
      'Use what’s already in your fridge — no special keto shopping',
      'Every recipe keeps you under your carb target, automatically',
      'Hit your macros without tracking a single thing',
    ],
    source: 'Follows widely recognized ketogenic diet principles',
  },
  {
    id: 'paleo',
    label: 'Paleo',
    emoji: '🦴',
    tagline: 'Whole foods · No grains',
    color: '#7B4A1E',
    accentColor: '#faf0e6',
    premium: true,
    benefits: [
      'Whole-food dinners from the groceries you already bought',
      'No grains, no processed junk — sorted for you',
      'A clean week of eating, planned in one scan',
    ],
    source: 'Follows widely recognized paleo diet principles',
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    emoji: '🥦',
    tagline: 'Plant-forward · No meat',
    color: '#2d6a4f',
    accentColor: '#edf7f1',
    premium: false,
    benefits: [],
    source: 'Follows widely recognized vegetarian nutrition principles',
  },
  {
    id: 'vegan',
    label: 'Vegan',
    emoji: '🌱',
    tagline: 'Fully plant-based',
    color: '#40916c',
    accentColor: '#edf7f1',
    premium: true,
    benefits: [
      'Fully plant-based dinners from what’s in your kitchen',
      '7 different recipes so no week feels repetitive',
      'Balanced nutrition without the meal-planning headache',
    ],
    source: 'Follows widely recognized vegan nutrition principles',
  },
];
