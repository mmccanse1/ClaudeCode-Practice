# Version 2 — Upgrade Ideas

Ideas discussed during development. Not in scope for v1 launch.

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
