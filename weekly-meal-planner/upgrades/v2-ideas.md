# Version 2 — Upgrade Ideas

Ideas discussed during development. Not in scope for v1 launch.

---

## ✅ STATUS — updated 2026-06-28

Some of the items below have shipped or been overtaken since this doc was written:

- **Macro breakdown on cards** — ✅ DONE. Basic per-serving macros now show (calories, protein, carbs, **fat**, sugar, sodium). The *detailed/premium* layer (net carbs, fiber, micronutrients) is specced in **`detailed-macros-marge.md`**.
- **Diabetic-friendly / heart-healthy** — ✅ DONE as toggles (Diabetic + Low Salt), layered on any diet.
- **Claude vs Gemini** — ✅ RESOLVED: meal-gen + OCR run on **Claude** (this doc's "uses Gemini" references are stale). Images run on Imagen via a **Cloudflare Worker proxy + shared cache** (the "backend proxy / 503 risk" item is largely addressed for images).
- **Pricing** — decided: **$4.99 one-time Pro unlock**, no subscription at launch (this doc's "$2.99/mo" is superseded — see the `project-pricing-strategy` memory).
- **Ethnic / world cuisines** — NOT built; implementation-ready modules now specced in **`cuisines-gladys.md`**.
- **Sides & desserts** — NOT built; specced in **`sides-desserts-erika.md`**.
- **Premium pantry (spice rack / shelf backgrounds) + quantity tracking** — NOT built; still v2.
- **ScanReceipt layout** (meals control, sides/desserts placement, locked-premium treatment) — design recommendation in **`scanreceipt-layout-design.md`**.

The original idea list below is kept for reference.

---

## 🥔🍰 Stand-Alone Sides & Desserts (toggle: paired vs. solo)

**The insight (owner, 2026-06-28):** *"If someone wants to just make a week's worth of side dishes, go ahead and let them. Maybe they came up with a main on their own. I'm certainly not one to limit a home cook!"* — same applies to desserts.

**Current behavior (Build 3a — sides):** Sides are a *dependent* course. They generate only as an add-on alongside mains, and the app forces a dinner when no main is picked, so sides are always paired to a dinner and carry a `pairingNote`. There is no way to ask for *just* 5 sides (or, later, *just* 3 desserts) on their own. Desserts (Build 3b) will inherit the same paired-only assumption unless this is addressed.

**The idea:** Let sides and desserts be generated **stand-alone** — a full short course with no main required — for cooks who've already planned their own entrées.

**Proposed UX:** a small toggle on the Add-ons control, e.g. **"Pair to my dinners" ⇄ "Make on their own"** (default = paired). When "on their own":
- Don't force a dinner just to satisfy pairing.
- Skip the pairing pass entirely; `buildSidePairing([])` already has the standalone fallback (varied sides, `pairingNote` becomes a generic serving suggestion). Decide whether to drop `pairingNote` entirely in solo mode or keep it as a loose suggestion.
- Allow generating sides and/or desserts as the *only* output of a generation (no breakfast/lunch/dinner selected).

**Implementation notes (low effort — the seams already exist):**
- `generateMealPlan` already accepts `includeSides` and runs sides as a separate pass; the empty-dinners fallback in `buildSidePairing(dinners)` already handles "no mains." The main work is *UI*: stop forcing dinner in `ScanReceiptScreen.handleGenerate` when only add-ons are selected, and add the paired/solo toggle state.
- Desserts (Build 3b) should be built with this toggle in mind from the start so it doesn't need retrofitting — mirror whatever sides land on.
- Edge: a solo-sides week is `mealTypeCount === 1` → renders as the single-meal flat list (5 cards). Confirm that reads well (it should — same path as a dinner-only week).

**Files to touch:** `ScanReceiptScreen.tsx` (toggle + don't-force-dinner logic), `claudeService.ts` (`generateSides`/future `generateDesserts` already standalone-capable; maybe a `paired: boolean` param to drop the pairing note cleanly).

---

## 📊 Macro Breakdown on Recipe Cards

**The insight (from focus group):**
The app generates a one-sentence `nutritionNotes` field per recipe but shows no actual numbers. For keto users especially, net carbs, fat, and protein are the whole ballgame — a recipe described as "low carb" is worthless without a number. This was flagged as a non-negotiable gap.

**The concept:**
Ask Claude to return estimated macros alongside each recipe in the JSON response — or make a second lightweight API call to estimate macros from the ingredient list.

**Proposed recipe JSON additions:**
```json
"macros": {
  "calories": 480,
  "proteinG": 38,
  "fatG": 22,
  "carbsG": 18,
  "netCarbsG": 12,
  "fiberG": 6
}
```

**Display ideas:**
- Compact macro bar on the RecipeCard (icons + numbers in a row below the meta row)
- Full macro panel on the RecipeDetail screen
- For keto users: highlight net carbs prominently in a colored badge (red if over threshold, green if compliant)
- For general users: show calories + protein only to keep it uncluttered

**Files to touch:** `claudeService.ts` (extend JSON shape in prompt and `RECIPE_SHAPE` const), `types/index.ts` (add `macros` field to `Recipe`), `components/RecipeCard.tsx` (macro bar UI), `screens/RecipeDetailScreen.tsx` (full macro panel)

---

## 🧮 Pantry Quantity & Consumption Tracking

**The concept:**
When a pantry item is scanned or added, the app caches not just the item name but its **total quantity** — normalized into a standard unit (cups, oz, grams, count). As the item is used across weekly recipes, the quantity decrements. When it hits zero, the item automatically disappears from the pantry. This turns the pantry from a static ingredient list into a live inventory.

**How it would work:**

1. **At scan time:** Claude parses the receipt and returns both the item name AND quantity/unit from the receipt text (e.g., `"1 gallon whole milk"` → `{ name: "whole milk", quantity: 16, unit: "cups" }`). Common unit conversions handled automatically: 1 gallon = 16 cups, 1 lb = 16 oz, 1 dozen = 12 count, etc.

2. **At recipe generation time:** Claude tags each ingredient in a recipe with an estimated consumption amount (e.g., `"2 cups whole milk"`). The service maps that back to the pantry item and decrements the stored quantity.

3. **Live pantry state:** Each pantry tile shows a quantity badge (e.g., "9 cups remaining"). A subtle low-quantity indicator (amber color) appears when below ~20% of original. When quantity reaches 0, the item is removed from the pantry automatically.

4. **Manual override:** Users can tap a pantry item to manually adjust the quantity (e.g., if they used some outside of a recipe, or bought more).

**Proposed pantry item schema:**
```ts
interface PantryItem {
  name: string;
  quantity: number;       // current remaining amount
  originalQuantity: number;
  unit: string;           // 'cups' | 'oz' | 'g' | 'count' | 'lbs' | 'ml'
  addedAt: string;
  category: 'refrigerated' | 'spices' | 'dry_goods';
}
```

**Files to touch:** `types/index.ts` (new `PantryItem` interface), `services/pantryService.ts` (quantity storage + decrement logic), `services/claudeService.ts` (parse quantities from receipt, tag recipe ingredient amounts), `screens/PantryShelvesScreen.tsx` (quantity badge UI, low-quantity styling, auto-remove at 0), `screens/ScanReceiptScreen.tsx` (pass quantity data through the flow)

---

## 🌍 Ethnic & Regional Cuisine Diet Tiers

**The insight (from focus group):**
The free Mediterranean tier assumes a Western pantry baseline. Users with South Asian, East Asian, Middle Eastern, or Latin American pantries get recipes that ignore their existing ingredients (garam masala, ghee, turmeric, miso, tahini, etc.). This is a large underserved demographic in English-language meal planning apps.

**Ideas:**
- Add cuisine-aware diet tiers: **Indian/South Asian Vegetarian**, **East Asian**, **Middle Eastern**, **Latin American**
- Alternatively, make the AI ingredient-aware before selecting a cuisine style — if the input list contains garam masala, cumin seeds, ghee, and basmati rice, bias the recipe output toward South Asian flavors even within a "Vegetarian" or generic free tier
- Add spice rack awareness: when a user has specific spice profiles in their pantry (e.g., ras el hanout, five-spice, sumac), surface that as a cuisine signal to the AI prompt
- Could be a premium "World Cuisine" tier, or individual cultural tiers at the same $2.99/mo price point

**Files to touch:** `claudeService.ts` (new cuisine-aware system prompts), `constants/dietTypes.ts` (new diet type IDs), `types/index.ts` (extend `DietType` union)

---

## 🤖 Anthropic Claude API vs. Gemini — Evaluate Before Backend Build

**The question:**
The app currently uses Google Gemini (`gemini-2.5-flash`) for both receipt OCR and meal plan generation. Before building the subscription backend and moving to a paid API key, evaluate whether switching to the Anthropic Claude API would be a better long-term choice.

**Angles to explore:**

| Factor | Gemini | Claude (Anthropic) |
|---|---|---|
| Recipe quality | Good | Potentially better reasoning, more nuanced dietary guidance |
| OCR / vision | Yes (receipt scanning) | Yes (Claude supports vision) |
| Free tier | Yes (current setup) | Limited — paid from the start |
| Pricing | Competitive | Compare per-token costs at expected usage volume |
| Uptime / reliability | 503s observed on free tier | Paid tier SLA — worth comparing |
| API stability | Google ecosystem | Anthropic — independent, focused on AI |
| SDK | REST only | Official Anthropic SDK (TypeScript/JS available) |
| Streaming | Yes | Yes |

**Note:** The backend proxy (Node/Express) planned for v2 makes an API swap almost trivial — the model call is in one place (`claudeService.ts`). This decision does not need to be made before the proxy is built.

**Recommendation to evaluate:** Run the same meal plan prompt through both APIs side-by-side and compare recipe quality, consistency, and adherence to diet guidelines before committing to either for the paid tier.

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

**⚠️ Also critical for API reliability — see Gemini API Risk note below.**

---

## ⚠️ Gemini API Reliability Risk (Pre-Launch Blocker)

**The problem:**
The app calls the Gemini API directly from the client using a free-tier API key. Free tier users are deprioritized during high-demand periods — resulting in 503 "UNAVAILABLE" errors that completely block the core feature (generating a meal plan). Observed in real usage even with very low call volume.

**Why this matters:**
A regular user who hits this on their first generate attempt will likely delete the app. The entire value proposition is blocked when Gemini is down.

**The fix (tied to Subscription Backend):**
- Route all Gemini calls through a **backend proxy server** (Node/Express on Railway or Render)
- Use a **paid Gemini API key** on the server — paid tier has higher limits and better uptime SLA
- Add **server-side retry with backoff** so transient 503s are handled silently before the user ever sees an error
- Optional: add a **fallback model** (e.g. Claude or GPT-4o) if Gemini is down entirely

**This is the #1 infrastructure item before scaling to real users.**


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

---

## 💰 Subscription Promotions


- First month free (trial period to convert free users)
- Discounted annual plan (e.g. $19.99/year vs $2.99/month — saves the user ~$16)
- Launch week promo — limited time reduced rate to drive early adoption
- Referral program — existing subscriber shares a link, both parties get a free month
- Seasonal promotions — New Year "fresh start" discount, back-to-school meal planning push
- Bundle pricing if additional diet types are added as separate tiers later
