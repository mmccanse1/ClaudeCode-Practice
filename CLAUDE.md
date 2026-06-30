# Claude Session Notes

## User Environment

- **OS**: Windows
- **Root user folder**: `C:\Users\thoma`
- **Repo location**: `C:\Users\thoma\ClaudeCode_Practice\ClaudeCode-Practice`
- **App folder**: `C:\Users\thoma\ClaudeCode_Practice\ClaudeCode-Practice\weekly-meal-planner\app`

## IMPORTANT — Two local clones, one GitHub remote

There are two local clones of the same GitHub repo (`mmccanse1/ClaudeCode-Practice`):
- `C:\Users\thoma\ClaudeCode_Practice\ClaudeCode-Practice` — **DEV SERVER RUNS FROM HERE** (user's working path)
- `C:\Users\thoma\OneDrive\Documents\ClaudeCode_Practice` — Claude Code session working directory

**Always run git commits and pushes against the ClaudeCode_Practice path**, or push to GitHub and pull into both. The Expo dev server reads from the ClaudeCode_Practice path, so changes must be there for the user to see them in Expo Go.

## Navigate to app

```
cd C:\Users\thoma\ClaudeCode_Practice\ClaudeCode-Practice\weekly-meal-planner\app
```

## Pending Adjustments — Pre-Stress-Test Fixes

These items were flagged by the owner and should be addressed before or alongside the next review pipeline run.

### UI / Layout
- **Home screen**: Scale all proportions so the home screen fits on a single screen — no scrolling required. Achievable given the other layout changes already planned.
- **Diet type selector**: Replace current display with a dropdown labeled "Choose a Diet"
- **Current Menus**: Add a dropdown for "Current Menus" that allows filtering/selection by diet type
- **How It Works section**: Keep the button where it is, but shrink the entire section by 10% proportionately — reduce scroll length on the menu page
- **YourWeeklyMenu**: Tighten layout to fit screen size; Day buttons can be shrunk to reclaim space
- **Pantry photo**: Re-scale to appropriate proportions
- **My Pantry subline**: Remove the "Items here" subline under the My Pantry heading
- **ScanReceipt page**: Too busy for first-time users — simplify and reduce cognitive load on initial use
- **CSS / Color**: Replace grey with light blue throughout

### Bugs
- **Recipe card images not generating** — images fail to load even after opening the recipe detail view
- **New Recipe button times out** — investigate and fix the timeout on recipe regeneration

### Logic / Content Rules
- **Dinner protein rule**: Dinners should generally include a meat or seafood protein when the diet allows — aim for most of the week. Eggs are NOT acceptable as the primary dinner protein. "generally / most of the week" for the soft rule, hard "NOT" for the egg exclusion; no percentage or exact count (soft language works for both 7-recipe batches and single regeneration).
  - **IMPLEMENTED + made diet-aware (do NOT revert to one static `MEAL_DIRECTIVE['dinner']` string):** the meat/seafood rule lives in `dinnerProteinRule(dietType)` and applies ONLY to meat-allowing diets. **Vegetarian and vegan are EXEMPT** — they center a diet-appropriate protein instead (vegan: plant proteins, no eggs/dairy; vegetarian: legumes/tofu/cheese/eggs). Also `buildProteinConstraint` is diet-aware so a shared-household receipt's chicken is never offered to a veg/vegan menu.
- **Macros missing**: Numerical macro values (calories, protein, carbs, fat) are not displaying — this is likely an unintended consequence of the Phase 8 legal copy changes. Numerical values are fine to show; only health *claim* language was removed. Restore macros.
- **Pantry deduplication (storage fix)**: When a receipt is scanned, recurring items (e.g. milk, eggs) must be matched against existing pantry entries and quantities updated — not added as new entries. Accumulating duplicate entries also bloats cached image/data storage over time. Add a catch-guard on receipt scan: if item already exists in pantry, increment quantity; do not create a duplicate.

- **Pantry-as-menu-source discoverability**: It is not apparent anywhere that a user can generate a menu directly from their pantry without scanning a receipt. **Team consensus: implement Option C first, Option B second.**
  - **C (implement now)**: Show pantry item count on the Home screen — e.g. *"Pantry: 14 items ready"* — so users see the pantry as an active ingredient resource, not a passive storage drawer. Low risk, no new navigation paths, changes the user's mental model globally. Hide or show "0 items" gracefully when pantry is empty.
  - **B (add when wizard is built)**: Add a *"Skip — use my pantry"* button on Step 1 of the ScanReceipt wizard that jumps straight to Step 3. Catches users at the exact moment of friction. Add after the stepped wizard is in place.
  - **A (skip)**: Instructional copy on the Home screen gets skimmed and forgotten. Behavioral cues outperform text hints.

### Future Considerations (Deferred)
- **User Accounts + Allergy Profiles**: Allow users to create accounts and input dietary allergies so the app can filter recipes and meal plans accordingly. Deferred — revisit if/when pursuing formal health advice legitimization.

---

## Handoff Note — Next Session Startup

1. Pull from branch `claude/weekly-meal-planner-rs3zfh`
2. Read this file in full
3. Friday plan: pantry rebuild → cuisine move to home screen → Google Play beta setup

---

## Next Session — Planned Build Order (Friday)

1. **Pantry rebuild** — largest edit of the project. New data model: PantryItem objects with name, quantity, unit, category. Migration from string[] to PantryItem[] without losing existing user data. ScanReceipt integration needs to write quantities ("2 lbs chicken" → structured object). Menu generation prompt needs pantry formatted with quantities.
2. **Move cuisine type selector to Home screen** — currently lives inside the scan/generation flow. Moving to Home means passing both `dietType` + `cuisineType` as nav params. Type change in `RootStackParamList` in `types/index.ts` — ripples wherever cuisine is read.
3. **Google Play beta testing setup** — build Android APK via Expo EAS Build, upload to Play Console internal testing track, invite friends/family by Gmail. Do NOT attempt Android Studio emulator again — it has produced DLL errors three times. Use EAS Build + real devices instead. User's own device is iPhone so Android testing requires borrowing a device or using BrowserStack/Appetize.io.
4. `/dev-team-review` — implement all pending adjustments listed above before any testing
5. `/stress-test` — hammer the fixed build
6. `/dev-team-review` — catch anything the stress test surfaces
7. `/user-panel-review` — targeted trust check post-legal copy changes

---

## App Store Description — Final Approved Version
*(Session 2026-06-30 — reviewed by full marketing team + user panel, consensus draft)*

**Weekly Meal Planner — Dinner Ideas from Your Grocery Receipt**

Meal planner. Recipe generator. Dinner ideas from what you already bought. No subscription. No account required.

---

Snap your grocery receipt — or scan individual items straight into your pantry. Pick a diet — Mediterranean, Keto, Paleo, Vegetarian, Vegan, or Homestyle (no restrictions). Get 7 dinners built around what's actually in your kitchen.

That's it. Three steps.

One developer built this because the fridge-staring problem is real. You bought groceries. You just don't know what to make with them.

Now you will.

Each recipe comes with ingredients, steps, and nutrition info — calories, protein, carbs, fat. Something like: honey garlic salmon with roasted broccoli and rice. Swap any recipe you don't like. Save and share the ones you do. As you cook through the week, your pantry updates — so your next menu always starts from what you actually have left.

No account to create. No paywall on the core feature. Your data isn't sold — this app exists because I wanted it to exist, not to profit from your information.

You'll know what's for dinner before you change your shoes.

---

## App Store / Marketing Notes
- **Subtitle (30 chars):** "Dinner Ideas from Your Receipt" or "AI Recipes from Your Groceries"
- **Keywords to hit:** meal planner, recipe generator, dinner ideas, grocery list, meal prep, weekly dinner planner, recipe from ingredients, AI recipes, what to cook tonight
- **Screenshot 1:** Receipt photo → recipe cards (the transformation). Non-negotiable.
- **Screenshot 3:** Trust screen — "No account. No paywall. No data sold." bold, clean, white bg.
- **App preview video:** 15–30 sec showing core flow. Lifts conversion 20–35% in Food & Drink category.
- **Review prompt:** Trigger after first successful recipe generation — peak satisfaction moment.
- **Primary category:** Food & Drink. **Secondary:** Lifestyle.
- **Google Play:** $25 one-time fee (vs Apple $99/yr). Start here. Play Console accessible from any browser including iPhone.
- **Diet label:** "Home-Style" renamed to "Homestyle" (no hyphen) in dietTypes.ts — committed to branch.

---

## Competitive Context
- **Cooklist:** VC-backed, hits paywall page 2, collects data, has licensed grocery database with product-accurate images. Ahead on pantry icon quality.
- **Our advantages:** No sign-up friction, AI recipes built from actual user groceries (not fixed database), diet-aware personalization, genuinely free core feature.
- **Image gap:** Barcode scanning via Open Food Facts covers packaged goods. Fresh produce/bulk items remain the unsolved gap — no one has cleanly solved this without a licensed database.
