import { DietType } from '../types';

export interface DietConfig {
  id: DietType;
  label: string;
  emoji: string;
  tagline: string;
  color: string;
  accentColor: string;
  premium: boolean;
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
  },
  {
    id: 'keto',
    label: 'Keto',
    emoji: '🥩',
    tagline: 'Low-carb · High-fat',
    color: '#c0392b',
    accentColor: '#fdf0ef',
    premium: true,
  },
  {
    id: 'paleo',
    label: 'Paleo',
    emoji: '🦴',
    tagline: 'Whole foods · No grains',
    color: '#7B4A1E',
    accentColor: '#faf0e6',
    premium: true,
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    emoji: '🥦',
    tagline: 'Plant-forward · No meat',
    color: '#2d6a4f',
    accentColor: '#edf7f1',
    premium: true,
  },
  {
    id: 'vegan',
    label: 'Vegan',
    emoji: '🌱',
    tagline: 'Fully plant-based',
    color: '#40916c',
    accentColor: '#edf7f1',
    premium: true,
  },
];
