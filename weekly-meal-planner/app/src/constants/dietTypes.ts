import { DietType } from '../types';

export interface DietTypeConfig {
  id: DietType;
  label: string;
  emoji: string;
  isPremium: boolean;
  description: string;
  promptGuidelines: string;
}

export const DIET_TYPES: DietTypeConfig[] = [
  {
    id: 'mediterranean',
    label: 'Mediterranean',
    emoji: '🫒',
    isPremium: false,
    description: 'Heart-healthy, olive oil & fish based',
    promptGuidelines: `Mediterranean diet nutritionist following Mayo Clinic guidelines.
- Emphasise vegetables, fruits, whole grains, legumes, nuts
- Use olive oil as the main fat
- Include fish or seafood at least twice a week (vary: cod, sea bass, tuna, shrimp, sardines)
- Limit red meat to a few times per month
- Moderate dairy (mainly cheese and yoghurt)
- Salmon may appear in AT MOST 1 of the 7 recipes
- Do NOT use zucchini (courgette) or yellow squash`,
  },
  {
    id: 'keto',
    label: 'Keto',
    emoji: '🥓',
    isPremium: true,
    description: 'High fat, very low carb',
    promptGuidelines: `Ketogenic diet expert.
- Very low carbohydrate (under 50g net carbs per day across all meals)
- High fat (70–75% of calories): butter, cream, cheese, avocado, olive oil, nuts
- Moderate protein: meat, poultry, fish, eggs
- No grains, bread, pasta, rice, or potatoes
- No legumes (beans, lentils, chickpeas)
- No sugar or sweetened foods
- Low-carb vegetables only: leafy greens, broccoli, cauliflower, zucchini, peppers
- Berries in very small amounts only
- Vary proteins across the week`,
  },
  {
    id: 'paleo',
    label: 'Paleo',
    emoji: '🥩',
    isPremium: true,
    description: 'Whole foods, no grains or dairy',
    promptGuidelines: `Paleo diet expert following ancestral eating principles.
- Whole, unprocessed foods only
- Grass-fed meat, wild-caught fish, pastured eggs, nuts, seeds, vegetables, fruits
- No grains (wheat, oats, rice, corn)
- No legumes (beans, peanuts, lentils)
- No dairy products
- No refined sugars or seed oils (use olive oil, coconut oil, avocado oil)
- No processed or packaged foods
- Sweet potatoes and root vegetables are fine
- Vary proteins across the week`,
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    emoji: '🥗',
    isPremium: true,
    description: 'Plant-based with eggs & dairy',
    promptGuidelines: `Vegetarian nutrition expert.
- No meat, poultry, or seafood of any kind
- Eggs and dairy are allowed
- Emphasise plant-based proteins: lentils, chickpeas, beans, tofu, tempeh, edamame
- Include eggs and cheese for complete proteins
- Whole grains: quinoa, brown rice, farro, oats
- Wide variety of vegetables and fruits
- Healthy fats: olive oil, avocado, nuts, seeds
- Ensure iron and protein variety across the week`,
  },
  {
    id: 'vegan',
    label: 'Vegan',
    emoji: '🌱',
    isPremium: true,
    description: 'Entirely plant-based',
    promptGuidelines: `Vegan nutrition expert.
- No animal products whatsoever (no meat, fish, eggs, dairy, honey)
- Plant-based proteins: tofu, tempeh, seitan, lentils, chickpeas, black beans, edamame
- Nutritional completeness: combine protein sources across the week
- Calcium sources: fortified plant milk, broccoli, kale, almonds
- Iron sources: lentils, spinach, pumpkin seeds, fortified cereals (pair with vitamin C)
- Healthy fats: avocado, olive oil, nuts, seeds, coconut
- Whole grains for sustained energy
- Bold flavours: nutritional yeast, miso, tamari, smoked paprika`,
  },
];
