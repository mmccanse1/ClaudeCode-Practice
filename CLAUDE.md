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
3. **Google Play beta testing setup** — full checklist in the Google Play Beta section below. Do NOT attempt Android Studio emulator again — it has produced DLL errors three times.
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

---

## Google Play Beta Testing — Full Setup Checklist

### One-Time Setup (Do Once)
- [ ] Pay $25 Google Play developer fee at play.google.com/console — one-time, any browser including iPhone
- [ ] Create developer account (use personal Gmail — mmccanse@yahoo.com or a dedicated one)
- [ ] Create new app in Play Console: "Weekly Meal Planner"
- [ ] Fill in store listing basics (title, short description, category: Food & Drink) — doesn't need to be perfect yet
- [ ] Accept all policy agreements

### Build the APK (EAS Build — No Android Studio)
- [ ] Install EAS CLI if not already: `npm install -g eas-cli`
- [ ] Log in: `eas login`
- [ ] Configure build: `eas build:configure` (run once, creates eas.json)
- [ ] Build Android AAB (what Play Store requires): `eas build --platform android`
- [ ] EAS builds in the cloud — no emulator, no local Android SDK needed. Takes ~10–15 min. Download the .aab file when done.

### Upload to Play Console
- [ ] In Play Console → Testing → Internal testing → Create new release
- [ ] Upload the .aab file
- [ ] Add release notes (e.g. "First internal test build — please try scanning a receipt and generating a menu")
- [ ] Roll out to internal testing track

### Invite Testers
- [ ] In Play Console → Internal testing → Testers tab
- [ ] Add Gmail addresses of friends/family (up to 100)
- [ ] Copy the opt-in link Play Console generates
- [ ] Send testers: the opt-in link + instructions below

### Tester Onboarding Message (send this to testers)
> "Hey — I built a meal planning app and I'd love your honest feedback before I launch it publicly. Here's how to get it:
> 1. Make sure you're on an Android phone
> 2. Click this link: [opt-in link from Play Console]
> 3. Tap "Accept invite" then "Download on Google Play"
> 4. Try scanning a grocery receipt (or just add a few items to your pantry manually) and generate a week of dinners
> 5. Let me know what worked, what didn't, and anything that confused you
> No account needed — it works right away."

### What Testers Need
- Android phone (any modern Android — doesn't need to be a specific model)
- Google account (to accept the Play Store invite)
- The opt-in link you send them

### Testing Without an Android Device Yourself
- BrowserStack (free trial) or Appetize.io (100 free minutes) let you run the app on a real cloud Android device from your browser
- Use this to do a basic smoke test before sending to testers

### Notes
- Internal testing = invite-only, never shows in public Play Store search
- Play Console dashboard accessible at play.google.com/console from any browser/iPhone
- Install and crash data visible in Play Console in real time once testers start using it
- Monetization (IAP/credits) does NOT need to be wired up for internal testing — test the core flow first

---

## Business Model — UNRESOLVED (Decide Before Play Store Launch)

### The Core Problem
The "no account" positioning is great for trust but financially self-defeating at scale:
- No account = no way to track credits or subscriptions server-side
- No account = deleted app = lost purchase = refund dispute
- No account = no email list, no re-engagement, no lapsed user recovery
- No account = can't model LTV, can't justify paid acquisition
- The credit model Ethan suggested **requires knowing who the user is to work**

### The Middle Path (Recommended)
Keep "no account" true for the **free tier** — scan a receipt, get 7 dinners, no sign-up ever.

For **paid tier**: use Google/Apple store identity invisibly via **RevenueCat** (a library that manages purchase entitlements tied to the user's Google/Apple account). Users never create a "Weekly Meal Planner account." Their store account handles it silently. Marketing stays honest: *"No account to create."*

### Monetization Options (Ranked)

| Model | Year 1 (500 users, 50% convert) | Monthly cost at 500 users | Verdict |
|---|---|---|---|
| $4.99 one-time (current) | ~$1,250 total, done | ~$75/mo ongoing | Bleeds out by month 3 |
| Credits ($1.99/pack) | Depends on recharge rate | ~$75/mo | Sustainable if 20% recharge monthly |
| **$24.99/year (recommended)** | **~$6,247** | **~$75/mo** | **Best math, lowest resistance** |
| $2.99/month | ~$8,970/year | ~$75/mo | Best ceiling, highest resistance |

### User Panel Verdict on Subscription
- **Devon (teacher, 34):** Won't pay $2.99/month yet — "subscriptions require trust built over time." Would consider annual. Keep one-time unlock, add subscription as a separate tier with extras (cloud backup, recipe history).
- **Priya (nurse, 38):** Paused at monthly, but *"$24.99/year feels honest."* Value feels front-loaded — app goes quiet between Sunday meal plans. Would subscribe if it became a weekly cooking partner, not just a Sunday tool.

### API Cost Reality
- ~$10–15/month per 100 users at moderate usage (40% active, 2 menus/month)
- Shared image cache (Cloudflare Worker) reduces Imagen costs as recipe catalog grows
- At 1,000 users: ~$130/month in API costs. $50 Anthropic budget lasts under a month.
- **Conclusion:** one-time purchase revenue is a spike; API costs are a compounding bleed.

### Action Items (Next Budget Week)
- [ ] Decide on monetization model before Play Store submission — this cannot wait
- [ ] Research RevenueCat integration (free tier available, handles iOS + Android)
- [ ] Build a proper business/financial model team to run projections
- [ ] Consider $24.99/year as launch price with credits as a future add-on
