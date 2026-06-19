# Weekly Meal Planner

A React Native (Expo) mobile app for iOS and Android that generates a personalized
7-day Mediterranean diet meal plan from your grocery receipt and pantry items.

## How it works

1. **Photograph your receipt** — the app uses Claude AI vision to extract all ingredients automatically.
2. **Add pantry items** — staples you already have at home persist between sessions.
3. **Generate your week** — Claude creates 7 Mediterranean diet recipes using only what you have,
   following Mayo Clinic guidelines (emphasis on vegetables, whole grains, legumes, olive oil, and fish).
4. **Save recipe cards** — each recipe generates a beautifully formatted HTML card with a food photo
   (via Unsplash), ingredients list, step-by-step instructions, and a nutrition note.

## Folder structure

```
weekly-meal-planner/
├── input/
│   ├── pantry_template.json     # Example pantry items to get started
│   └── receipts/                # Receipt photos (gitignored)
├── output/
│   └── example_recipe_card.html # Preview of generated recipe card format
└── app/                         # Expo React Native app
    ├── App.tsx
    ├── app.json
    ├── package.json
    ├── .env.example             # Copy to .env and add your API keys
    └── src/
        ├── screens/
        │   ├── HomeScreen.tsx
        │   ├── ScanReceiptScreen.tsx
        │   ├── PantryScreen.tsx
        │   ├── MealPlanScreen.tsx
        │   └── RecipeDetailScreen.tsx
        ├── services/
        │   ├── claudeService.ts    # Receipt OCR + recipe generation
        │   ├── pantryService.ts    # AsyncStorage pantry persistence
        │   ├── unsplashService.ts  # Free food photos
        │   └── cardGenerator.ts   # HTML recipe card builder + sharing
        ├── components/
        │   ├── RecipeCard.tsx
        │   └── PantryItemRow.tsx
        ├── navigation/
        │   └── AppNavigator.tsx
        └── types/
            └── index.ts
```

## Setup

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Add API keys

```bash
cp .env.example .env
```

Edit `.env` and add:

| Variable | Where to get it | Required? |
|---|---|---|
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Yes |
| `EXPO_PUBLIC_UNSPLASH_ACCESS_KEY` | [unsplash.com/developers](https://unsplash.com/developers) (free) | No — falls back to emoji placeholder |

### 3. Run the app

```bash
npm start          # Opens Expo Go QR code — scan with your phone
npm run ios        # iOS simulator (requires Xcode on Mac)
npm run android    # Android emulator
```

### 4. First run on your phone

Install **Expo Go** from the App Store or Google Play, scan the QR code, and the app
loads instantly — no build step required for development.

## Building for production

```bash
npx eas build --platform ios     # iOS .ipa
npx eas build --platform android # Android .apk / .aab
```

Requires an [Expo account](https://expo.dev) and EAS CLI (`npm install -g eas-cli`).

## Notes

- Your Anthropic API key is bundled in the app binary. For a personal/private app
  this is acceptable; for a public release, proxy calls through a backend instead.
- Recipe photos use the Unsplash free tier (50 requests/hour). Cards without a key
  display an olive emoji placeholder — everything else works identically.
- Pantry items are stored in the device's AsyncStorage and persist indefinitely.
  Use the "Clear all" button in the Pantry screen to reset.
- Saved recipe cards (HTML files) are written to the app's document directory and
  can be shared via the system share sheet to Notes, Mail, Files, etc.
