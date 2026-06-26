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
      'Low-carb meal plans built from your groceries',
      'Stay in ketosis without the guesswork',
      'Personalized macros from what you already own',
    ],
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
      'Whole-food meals with no grains or processed ingredients',
      'Built from your real grocery haul each week',
      'One clean week of eating, planned automatically',
    ],
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
      'Fully plant-based menus from your pantry',
      '7 diverse plant-forward recipes per week',
      'Complete nutrition powered by your ingredients',
    ],
  },
];
