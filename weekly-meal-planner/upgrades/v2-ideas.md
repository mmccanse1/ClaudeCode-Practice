# Version 2 — Upgrade Ideas

Ideas discussed during development. Not in scope for v1 launch.

---

## 🫙 Visual Spice Rack (Premium Pantry)

**The concept:**
Replace the flat spice tile grid with a custom-designed spice rack UI. No real photo needed — built entirely from React Native components.

- Warm wood-colored background
- Grid of `SpiceJar` components (jar shape styled as React Native Views)
- **Empty jar**: semi-transparent glass look, faint outline — waiting to be filled
- **Filled jar**: label strip appears in the center with the spice name; Unsplash photo tinted amber as jar background
- Jars fill in row by row as spices are scanned from receipts

```
[ oregano ]  [ cumin ]  [ paprika ]  [ ○ ]  [ ○ ]  [ ○ ]
   (full)      (full)     (full)    (empty) (empty) (empty)
```

**Files to touch:** `PantryShelvesScreen.tsx`, new `SpiceJar.tsx` component

---

## ❄️ Refrigerator Shelf Background (Premium Pantry)

**The concept:**
For the Refrigerated pantry section, use an `ImageBackground` fetched from Unsplash (`"refrigerator shelf white clean interior"`) with the food item tiles overlaid — milk, chicken, cheese, produce sitting on a real-looking fridge shelf.

**Files to touch:** `PantryShelvesScreen.tsx`, possibly a new `fetchSectionBackground()` in `unsplashService.ts`

---

## 🥫 Themed Pantry Shelf Backgrounds (Premium Pantry)

**The concept:**
Each section gets a themed background:

| Section | Unsplash search term |
|---|---|
| Refrigerated | `"refrigerator shelf interior white"` |
| Spices | Custom jar UI (see above) |
| Dry Goods | `"rustic wood pantry shelf"` |

Backgrounds fetched once on first load, cached locally.

---

## 💳 Subscription Backend

**The concept:**
Replace the hardcoded `IS_PREMIUM = false` flag with a real subscription status check.

- **Node/Express server** (deployable to Railway or Render) to proxy Claude API calls and track usage
- **Google Play Billing** (Android in-app purchases)
- **Apple App Store IAP** (iOS)
- **Stripe** (web version)
- User token system so `IS_PREMIUM` reflects real payment status

**Current state:** All gating UI is wired up and ready. Only the flag needs to be swapped for a real check.
`src/constants/subscription.ts` → `export const IS_PREMIUM = false;` is the seam to replace.

---

## 🍽️ Additional Diet Types

**Current:** 5 diet types coded (Mediterranean free, Keto/Paleo/Vegetarian/Vegan premium)

**Ideas for future tiers:**
- Whole30
- Low-FODMAP (IBS-friendly)
- Diabetic-friendly (low glycemic index)
- Heart-healthy (AHA guidelines)
- High-protein / athlete

---

## 📋 Per-Diet Multi-Menu History

**The concept:**
Each diet type currently stores one "current plan" (7 days, expires). Future: store a history of past plans per diet type so users can browse and re-run a favorite week.

**Storage key pattern:** `@meal_planner_plan_history_mediterranean` → array of past plans (capped at 5 or 10)

---

## 🤖 Labeled Ingredient Groups in AI Prompt

**The concept:**
Pass categorized pantry data to Claude instead of a flat list:

```
Available ingredients:
- Refrigerated: eggs, chicken breast, cheddar
- Spices: cumin, paprika, oregano
- Dry Goods: pasta, canned tomatoes, olive oil
```

Gives the AI context about perishability and flavor roles → better recipe suggestions.

**Files to touch:** `claudeService.ts` `generateMealPlan()` + `regenerateRecipe()`, `ScanReceiptScreen.tsx`

---

## 🌿 Manual Section Reassignment (Pantry)

**The concept:**
If auto-categorization puts an item in the wrong section, let the user long-press an item tile on PantryShelvesScreen to move it. Alert with 3 section choices → `moveItem(item, toSection)` service function.

---

## 📸 Visual Pantry Shelf (Free Tier Upgrade)

**Current free tier:** flat grid of all pantry items.
**Possible v2 free improvement:** give free users a nicer single-shelf visual (wood plank background from Unsplash) while keeping the 3-section organization as the premium differentiator.

---

## 🎟️ Promo / Access Codes for Friends & Family

**The concept:**
A promo code or access code system that unlocks the full premium tier for free — so you can give family members or close friends the full experience without them paying.

- Could be a simple hardcoded list of codes that map to IS_PREMIUM = true
- Or tied to the future subscription backend (redeem code → bypass payment, set account as premium)
- Useful for gifting, beta testers, influencer partnerships, or just family

**To explore:** How codes are generated, how many, expiry dates, single-use vs. multi-use.
