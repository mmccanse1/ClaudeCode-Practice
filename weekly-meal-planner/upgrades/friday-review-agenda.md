# Friday Review Agenda — Condensed Bullet List

Consolidated from live testing notes (today) + everything in `weekly-meal-planner/upgrades/`. Organized for item-by-item discussion — nothing here has been implemented yet.

---

## 🗣️ Open With This — Standing Process Discussion (not a ticket, just talk)

**The pattern:** twice today, a value got hardcoded in a second place instead of derived from its single source of truth, and silently drifted out of sync when that source was updated.
- Pantry: `SPICE_KEYWORDS` / `FRIDGE_KEYWORDS` — ad hoc keyword lists in `pantryService.ts`, unrelated to any central category config.
- Home screen: `ALL_DIET_TYPES` in `currentMealPlanService.ts` — a hand-copied 5-diet array that drifted out of sync the moment `DIET_TYPES` (the real source of truth) grew to 6.

**Why worth five minutes Friday:** these are cheap individually, but the shape of the bug will keep recurring — anywhere a list of diets/cuisines/categories gets typed out a second time instead of imported from its config file, the next addition (7th diet, 6th cuisine, whatever) will silently miss that spot again. Worth deciding whether to just grep for the pattern occasionally, or something more structural (e.g., a lint rule, or just a habit of `DIET_TYPES.map(d => d.id)` instead of hand-typing arrays). No need to solve it today — just flag it as a standing thing to watch for rather than treating each occurrence as a one-off surprise.

---

## 🎯 Triage — Walk-In Order

Priority tiers, not just a re-listing. Full detail on every item is in the sections below — this is the "what do we touch first" cheat sheet. Each line includes a likely follow-up so nothing dead-ends after the fix lands.

### Tier 0 — Blocks the very next thing you're about to do
1. **Pantry categorization rewrite (`categorizeItem()`).** You're starting the pantry visuals rebuild — this has to land first or the new visuals just make miscategorized items more visible, not less. Owner ruleset is confirmed and ready to implement (see 🧺 Pantry section).
   - *Likely follow-up:* existing pantry items already saved under the old logic won't retroactively re-sort — decide whether to run a one-time re-categorization pass on stored data, or just let it apply going forward. Also decide the `SPICE_KEYWORDS`/`FRIDGE_KEYWORDS` replace-vs-layer question flagged in that section before writing code.

### Tier 1 — Live, user-facing bugs
2. **Recipe card preview photos never update (dinner/sides).** Core feature looks broken to any user browsing their week, even though the image generation itself works.
   - *Likely follow-up:* once root-caused, check whether breakfast/lunch cards and the Week Share card have the same stale-cache pattern, or if it's genuinely isolated to dinner/sides.
### Tier 2 — Dated, external deadline (not urgent today, but needs a landing slot before Aug 17)
3. **Imagen 4 → Gemini 2.5 Flash Image migration.** Hard shutdown Aug 17, 2026 — recipe images break entirely if this slips past that date.
   - *Likely follow-up:* re-test image quality/accuracy across all 5 cuisines + Home-Style post-migration (response field names differ from Imagen's), and update the cost model for the ~2× price jump.
4. **Image rate-limit bottleneck / quota scaling.** Same problem area as #3 — worth deciding together rather than as two separate passes.
   - *Likely follow-up:* once the shared cache + throttling levers are in, re-measure whether Tier 2 (20 IPM) upgrade is still needed or if the cache alone solves it.

### Tier 3 — Small, already-decided changes (quick wins before the bigger builds)
5. **Move cuisine selector: Scan screen → Home screen.** Already has a 5/5 user-panel verdict — this is "go build it," not "go discuss it."
   - *Likely follow-up:* the ScanReceipt redesign spec (item in 🎨 UX section) was written assuming cuisine still lives on Scan — it doesn't mention a cuisine section at all. Revisit that spec's layout once cuisine moves, so the two pieces of work don't conflict.
5b. **Fix: Home-Style missing from "Current Menus" dropdown.** Confirmed one-line bug — `ALL_DIET_TYPES` in `currentMealPlanService.ts` is a hardcoded 5-diet array that was never updated when Home-Style shipped. Bundled here at the owner's request since it's the same Home screen area, though the fix itself has no actual dependency on the cuisine-selector move and could land any time.
   - *Likely follow-up:* audit for other hand-copied diet lists in the codebase (this is the second one found today, after the pantry keyword lists) — a pattern worth naming out loud Friday: anything that duplicates `DIET_TYPES` instead of deriving from it will keep silently missing new diets.
6. **Cuisine × diet/modifier compatibility-matrix gating (Phase 3).** Matrix data already exists in `cuisines-gladys.md` — this is wiring, not authoring.
   - *Likely follow-up:* needs a pass testing every diet+modifier combo in the matrix (East Asian+Low-Salt, Classic Home-Style+Keto, etc.) to confirm hidden cuisines actually disappear from the picker rather than just failing silently at generation time.
6b. **Delete button on saved recipe cards.** Backend (`unsaveRecipe`) already exists; just needs an `onDelete` prop on `RecipeCard` following the same pattern as the existing `onRefresh` prop, plus a confirm dialog matching the existing saved-menu delete pattern. Low risk, no dependencies — good one to knock out alongside the other Tier 3 items.
   - *Likely follow-up:* once recipes can be deleted individually, double check the "X recipes saved" count on `SavedRecipesScreen` updates immediately (it already does via `setRecipes` after delete, per the saved-menus pattern, but confirm the recipes-tab wiring matches).

### Tier 4 — Decisions needed before any code gets written
7. **Curated recipe library — direction, not implementation.** Owner is "seriously considering" but hasn't decided: monthly-cadence commitment vs. looser cadence, browse screen vs. folded into AI generation vs. both, and the legal read on monetizing it is still outstanding.
   - *Likely follow-up:* once direction is picked, seed it with the two recipes already mentioned (ratatouille, French onion soup) as the first real test of the extraction → library → app pipeline before treating it as a repeatable monthly process.
8. **Reference/suggested-dish database per cuisine.** Hard nudge vs. soft bias in the prompt is still an open call.
   - *Likely follow-up:* whichever approach wins, it needs a regression check against the existing weekly-variety rules (e.g., "don't repeat the same spice base twice") so the nudged dish doesn't fight the app's own variety logic.
9. **Stand-alone Sides & Desserts toggle ("pair" vs. "on their own").** Low implementation effort, but the UX toggle language/placement isn't decided.
   - *Likely follow-up:* per the original spec, build desserts (3b) with this toggle from the start rather than retrofitting — so this decision should land before dessert prompt-module work begins, not after.

### Tier 5 — The bigger builds (once Tiers 0–4 are clear)
10. World Cuisine modules — full build-out of the Gladys spec (content is implementation-ready).
11. Sides & Desserts premium content (Erika spec) — depends on the Tier 4 stand-alone-toggle decision landing first.
12. Detailed/premium macros — *recheck base macros are actually displaying correctly first* (known possible regression per CLAUDE.md) before layering the premium panel on top of a maybe-broken base.
13. ScanReceipt screen redesign — sequence after the cuisine-to-Home-screen move (Tier 3, #5) so the layout spec reflects the final screen contents.
14. Pantry premium visuals (spice rack, shelf backgrounds) — blocked on Tier 0 by definition; also needs the "frozen" 4th bucket question resolved so the visuals have a taxonomy to represent.
15. Subscription backend + monetization build-out — *likely follow-up:* if the curated recipe library (Tier 4, #7) becomes a Pro pitch, the backend needs to support content unlocks, not just generation-limit gating — worth designing both together rather than the backend first and recipes bolted on later.

### Tier 6 — Deferred, no near-term action needed
16. Additional diet types, promo/access codes, subscription promotions, per-diet multi-menu history.

---

## 🆕 New — From Today's Testing Session

- **Thumbs up / thumbs down on recipes — local only, per-user (decided: local, not cross-user)**
  - Owner's original idea had two parts: (1) per-user rating to bias that person's own future generations, and (2) cross-user "popular recipes" aggregation (X people liked it → treat as popular → prioritize popular + curated recipes over fresh AI generation).
  - **Decided: build (1) only, for now.** Store a simple rating locally alongside saved recipes (same `AsyncStorage` pattern as everything else in the app today); bias that user's own future generation away from thumbs-down dishes and toward thumbs-up ones — reuses the same "inject a specific recipe, tell the AI to build the week around it" mechanism already noted for the curated recipe library.
  - **(2) is explicitly deferred, not rejected.** Cross-user aggregation requires a real shared backend (server + database to count ratings across devices) — the app is currently 100% local `AsyncStorage`, no backend exists yet. Building server infrastructure just for recipe popularity, ahead of the Subscription Backend work already in Tier 5, would be backwards. When that backend eventually gets built (💳 Monetization section), popularity-aggregation and "prioritize popular/curated recipes before fresh AI generation" should be designed in as a requiremen of that build, not bolted on after — same dependency already noted for the curated recipe library's monetization angle.
  - **Files this would touch (for the local-only version):** a new small rating store (mirrors `savedRecipesService.ts`/`savedMenusService.ts` pattern), a thumbs up/down control on `RecipeCard.tsx` or `RecipeDetailScreen.tsx`, and a lightweight read in `claudeService.ts`'s generation call to bias against disliked recipes.

- **Delete button on saved recipe cards**
  - Owner request: add a delete option on saved recipe cards (Saved Recipes & Menus → Recipes tab) so users can remove ones they no longer want, not just add them.
  - Placement/style as specified: bottom of the card, green button, labeled "Delete Recipe."
  - **Low effort — the backend already exists.** `unsaveRecipe(recipe)` in `savedRecipesService.ts` is already built and already used (currently only wired to the bookmark toggle on `RecipeDetailScreen`). No new service logic needed, just a new UI entry point.
  - **Implementation pattern already exists in the codebase to copy:** `RecipeCard.tsx` already supports an optional bottom-row action button via its `onRefresh` prop (conditionally rendered only when passed in). Adding an `onDelete?: () => void` prop the same way — rendered only when `SavedRecipesScreen` passes it in — means the delete button only ever shows up on the Saved Recipes list, not on cards during AI weekly generation or the Day/MealPlan views where "delete" wouldn't make sense.
  - Should mirror the existing confirm-before-delete pattern already used for saved menus (`SavedRecipesScreen.handleDeleteMenu` uses `Alert.alert` with a Cancel/Delete choice) so recipe deletion has the same safety net.
  - Green button color: reuse an existing app green rather than inventing a new one — Vegetarian (`#2d6a4f`) or Vegan (`#40916c`) from `dietTypes.ts` are the closest existing brand greens.

- **Home-Style missing entirely from "Current Menus" (corrected diagnosis — supersedes the note below)**
  - Owner clarified: this isn't about the Saved Recipes & Menus screen — it's the Home screen's **"Current Menus"** dropdown. Home-Style doesn't appear as a category option at all; only the original 5 diets show up.
  - **Root cause — confirmed, not speculative.** `currentMealPlanService.ts` line 7: `const ALL_DIET_TYPES: DietType[] = ['mediterranean', 'keto', 'paleo', 'vegetarian', 'vegan'];` — a hardcoded array, separate from the central `DIET_TYPES` config in `dietTypes.ts` (which *does* correctly include `home_style`). `getAllCurrentPlans()` (line 109) loops over this hardcoded list to build the Home screen's dropdown — so Home-Style is structurally invisible to it, regardless of whether a plan was ever saved.
  - **The data itself is fine.** `saveCurrentMealPlan()` writes to a per-diet key (`dietKey(dietType)`) generically — a Home-Style plan gets saved correctly under `@meal_planner_current_plan_home_style`. It's purely the *read* side (`ALL_DIET_TYPES`) that never checks that key. This was a clean miss in PR #23 ("Add Home-Style as a 6th diet") — that PR touched `DietType`, `DIET_TYPES`, and `SAMPLE_PROTEINS`, but not this file.
  - **Fix is a one-line addition** (`'home_style'` added to `ALL_DIET_TYPES`) — trivial, no dependency on the cuisine-selector move. Owner asked to bundle it with the Home screen work anyway (Tier 3, #5) since it's the same screen/session — reasonable for workflow, just noting it doesn't *require* that timing.
  - Worth a quick check while in this file: is `ALL_DIET_TYPES` the only place a diet list got hand-copied instead of derived from `DIET_TYPES`? If so, future new diets will keep tripping this same class of bug.

- ~~Original (incorrect) theory, kept for the record:~~ the saved-menu duplicate-check issue in `savedMenusService.ts` (comparing recipe names without `dietType`) is a real code smell worth fixing regardless, but it was not the cause of this report — leaving it noted under Tier 4 hygiene rather than as an active bug investigation.

- **Recipe card preview photos never update (Dinner + Sides only)**
  - Reproduced with a fresh session, 24 recipes generated — not the 70/hr image-quota issue, since a brand-new session still shows it.
  - Symptom: card stays on the placeholder olive icon in both the "Add-ons" card and the day/menu list view (screenshots confirm: Monday dinner card, Monday side card, Tuesday dinner card all show olive placeholder).
  - Opening the **Recipe Detail** screen and waiting ~1 minute *does* load the real photo there.
  - But going back to the card/list view — even after the detail photo has already rendered once — still shows the placeholder. The real image never propagates back to the card.
  - Looks like a caching/state-sync bug, not a generation failure: the image exists (detail screen proves it), the card component just isn't picking it up.
  - Worth checking: is the card reading from a different cache key/field than the detail screen? Is there a re-render/subscription missing after the image resolves?

- **Reference/suggested-dish database per cuisine**
  - Owner's framing: *"if I put in ground beef and hit Home-Style Classic American, I expect meatloaf to show up at some point during the week."*
  - Current generation is fully freeform — no bias toward canonical/expected dishes for a given cuisine + core ingredient combo.
  - `cuisines-gladys.md` already has an "Example Dishes (Easy → Ambitious)" list per cuisine (e.g., Classic Home-Style lists meatloaf, pot roast, shepherd's pie, etc.) — the idea is to actually **use** those lists as a weighting/suggestion signal in the prompt, not just as spec documentation.
  - Open question for Friday: hard nudge ("include at least one dish from this list per week when the hero ingredient matches") vs. soft bias in the prompt? Same treatment for other cuisine modules (Indian, East Asian, Middle Eastern, Latin American)?

- **Curated recipe library — owner-added recipes alongside AI generation (seriously being considered, not yet committed)**
  - The idea: owner hands over a recipe (screenshot of a cookbook page, or verbally described) → Claude extracts it into the app's `Recipe` shape (ingredients, quantities, steps, macros, dietTags/cuisine) → committed to a small static library file in the repo (e.g. `src/data/curatedRecipes.ts`) → owner pulls into the `ClaudeCode_Practice` dev clone and sees it via Expo fast refresh, no app rebuild or store resubmission needed since it's pure JS/data.
  - **Feasibility:** low — the `Recipe` type already renders identically regardless of source, so the app-side lift is a library file + (later) logic to splice curated recipes into weekly generation alongside AI output. Estimated at a few hours for the library itself.
  - **Monetization angle under consideration:** "chef-curated recipes, new additions every month" as a Pro-tier selling point. Owner has NOT committed to the monthly-cadence promise yet — still deciding whether to take that on as an ongoing obligation vs. a looser "curated library, updated periodically."
  - **Copyright guardrail (important — carries into any code/prompt work on this):** extracting ingredients + quantities + mechanical steps from a cookbook screenshot is fine (functional facts, not protected expression). What must NOT happen: reproducing the source's actual descriptive prose/headnote text, or using the source's photo. Claude-written recipes from this pipeline need original descriptive text/headnote, same voice as AI-generated recipes — not paraphrase-adjacent to the source. Because this may become a **monetized** Pro feature, this graduates from "personal caution" to "get an actual legal read before shipping it as a paid feature" — do not treat this note as a legal clearance, it's a flag to verify externally.
  - **Open design question, still undecided:** does the curated library get its own "My Recipes" / browse screen, does it fold silently into weekly AI generation (with the AI told "this day is pre-filled, build the rest of the week around it" so variety rules don't get violated), or both? Affects the data shape (e.g., whether curated recipes need a "featured this month" flag) — decide before building the library file.

- **Pantry item categorization is broken — flagged before starting the visuals rebuild**
  - Live examples found scrolling the pantry: frozen pizza → Dry Goods, crispy fried onions → Refrigerated, (salted/unsalted) butter → Spices & Seasonings.
  - Root cause (confirmed in `pantryService.ts` `categorizeItem()`): pure substring keyword-matching across only 3 fixed buckets (spices → refrigerated → dry_goods, first match wins, in that priority order).
    - Butter: `SPICE_KEYWORDS` includes the bare word `'salt'` — "salted butter" / "unsalted butter" both contain "salt" as a substring, so they get caught by the spice check before the fridge list's `'butter'` entry is ever reached.
    - Crispy fried onions: `'onion'` is a `FRIDGE_KEYWORDS` entry meant for fresh onions, but it substring-matches inside "fried onions" even though the product is a shelf-stable jarred/canned topping.
    - Frozen pizza: doesn't match any spice or fridge keyword, so it falls through to the `dry_goods` default — and there's no "frozen" bucket in the taxonomy at all (only refrigerated / spices / dry_goods exist), so even a targeted fix needs a 4th section, not just a keyword tweak.
  - Flagging this now because the visuals rebuild is about to start — rebuilding pantry shelf visuals on top of this categorization logic will just make the wrong-bucket problem more visible, not fix it. Worth deciding before the rebuild: patch the keyword lists (quick, still fragile for other compound product names) vs. add a `frozen` section + smarter matching (e.g., check for whole-word/prefix matches instead of raw substrings, or route through AI-based categorization at scan time instead of local keywords).
  - **Not scan-specific — confirmed it's a single choke point.** All three entry paths call the same `categorizeItem()`: manual typed entry (`PantryScreen.handleAdd` → `addPantryItem`), barcode scan (`PantryScreen.handleScanAdd` → `addPantryItem`), and receipt scan (`ScanReceiptScreen` → `addPantryItems`, batch version). There is no separate categorization logic per input method, so a manually-typed "salted butter" miscategorizes exactly the same way a scanned one does. Any fix needs to happen once, in `categorizeItem()` itself, not per-entry-point.
  - **Owner-confirmed expected result (test case for the fix):** "salted butter" → Refrigerated, not Spices & Seasonings. Any keyword-priority fix (e.g., checking fridge keywords before the generic `'salt'` spice match, or requiring word-boundary matches instead of raw substrings) should be checked against this case directly.
  - **Owner-specified categorization rules (draft — for Friday, meant to replace the ad hoc keyword lists rather than patch them):**

    **→ Refrigerated:**
    - Anything dairy-based (milk, cheese, yogurt, cream, butter, etc.)
    - Fresh vegetables, including root vegetables (carrots, potatoes, onions, etc.)
    - Fresh fruits
    - Juices
    - Liquid beverages
    - Salad dressings
    - Condiments: ketchup, mustard (the prepared condiment), mayonnaise
    - Raw protein: eggs, beef, poultry, pork, seafood
    - Dairy-alternatives and their products, e.g. tofu, soy-based products such as alternative mayonnaise
    - Alternative milks (oat milk, almond milk, etc.)
    - Vegan refrigerated products generally

    **→ Spices & Seasonings (explicit override — these go here even though they read as "sauce" or "fresh item"):**
    - Sauces: Worcestershire, soy sauce, fish sauce
    - Fresh herbs, e.g. parsley
    - Mustard *seed* (distinct from prepared mustard — mustard condiment is Refrigerated, mustard seed is a spice)
    - Cumin
    - Tarragon — fresh or dried, both go to Spices & Seasonings (not just the dried form)

    **Note for Friday discussion:** this draft has a deliberate tension worth confirming out loud — "fresh herbs" (parsley) and "mustard seed" land in Spices & Seasonings by function/culinary role, while "fresh vegetables" land in Refrigerated by the same fresh/raw logic. That's the owner's call as stated, not a categorization-logic error, but it means the eventual matcher needs an explicit herb/seed exception list rather than a single "fresh → refrigerated" rule, or fresh herbs will keep getting miscategorized right alongside vegetables. Also worth deciding: does this rule set replace `SPICE_KEYWORDS`/`FRIDGE_KEYWORDS` wholesale, or layer on top as a set of overrides checked first?

    **✅ CONFIRMED — owner agrees, include in the code rewrite.** When `categorizeItem()` in `pantryService.ts` is rewritten, this ruleset (both lists above, including the explicit herb/seed exception list) is the spec to implement — not just patch notes to discuss. The herb/seed-vs-vegetable exception list must be built as explicit overrides checked ahead of any general "fresh → refrigerated" matching, or parsley/mustard seed/cumin/tarragon will fall back into Refrigerated via a generic fresh-produce rule.

---

## 🚨 Dated / Time-Sensitive

- **Imagen 4 shutdown — hard deadline Aug 17, 2026.** Must migrate `image-proxy/src/index.js` off `imagen-4.0-fast-generate-001` to Gemini 2.5 Flash Image before then. ~2× cost increase (~$0.02 → ~$0.039/image).
- **Image rate-limit bottleneck (today's placeholder/olive fallback on *quota*, separate from the card-sync bug above).** Gemini Tier 1 = 10 images/min. Options: Tier 2 upgrade (20 IPM, auto at ~$100+3 days spend), manual quota-increase request, shared KV cache (biggest lever), client throttling (already partially added).
- **Launch funding:** ~$200 to start (~$150 Google/Gemini, ~$50 Anthropic), don't over-fund up front — watch real burn 1–2 weeks then top up.

---

## 🍽️ Content & Cuisine

- **World Cuisine modules (Gladys spec) — implementation-ready.** Indian/South Asian, East Asian, Middle Eastern, Latin American, Classic Home-Style. Includes system-prompt text, pantry staples, techniques, example dishes, and a cuisine × diet compatibility matrix (e.g., Classic Home-Style excluded for Keto/Low-Salt/Diabetic).
- **Move the cuisine selector from Scan screen → Home screen, beside the diet picker.** *(Recovered from PR #22's "Still to come" list — user-panel verdict was 5/5 in favor, but this never got its own session or a note file, which is why it was missing.)* Cuisine currently lives as a Pro-gated selector on `ScanReceiptScreen`; the panel wants it promoted to a peer of the diet picker on the Home screen instead.
- **Cuisine × diet/modifier compatibility-matrix gating (Phase 3) — still pending.** Also flagged in PR #22 as "to follow" and never implemented. The matrix itself already exists in `cuisines-gladys.md` (e.g., East Asian excluded for Low-Salt/Paleo) — it just isn't wired into the cuisine picker's filtering logic yet.
- **Reference/suggested-dish database** — see "New" section above; ties directly into the example-dish lists already in this spec.
- **Sides & Desserts premium content (Erika spec) — implementation-ready.** 5 sides/week + 3 desserts/week (not full 7-day sets). Prompt modules, per-diet examples, keto/diabetic sweetener rules, lightweight pairing logic (no formal matrix).
- **Stand-alone Sides & Desserts toggle.** Let users generate sides/desserts without forcing a paired dinner — "Pair to my dinners" ⇄ "Make on their own" toggle. Low implementation effort; most of the backend seam already exists.

---

## 📊 Nutrition

- **Detailed/premium macros (Marge spec) — implementation-ready.** Adds fiber, net carbs, saturated fat, added sugar, cholesterol, omega-3, potassium, calcium, iron, magnesium, vitamin D/B12 as a `nutrition_premium` sibling object. Diet-specific emphasis mapping (e.g., Keto → net carbs; Vegan → B12/iron/calcium). Fixed disclaimer copy included.
- Base macros (calories/protein/carbs/fat/sugar/sodium) already shipped per CLAUDE.md status — confirm still displaying correctly given the "macros missing" bug noted there (may be resolved already, worth a quick recheck Friday).

---

## 🧺 Pantry

- **Pantry quantity & consumption tracking.** Parse quantity/unit at scan time, decrement as recipes consume ingredients, low-quantity indicator, auto-remove at zero, manual override.
- **Visual Spice Rack (premium).** Custom `SpiceJar` component grid, fills in as spices are scanned.
- **Refrigerator shelf background (premium).** Unsplash-fetched fridge interior behind refrigerated items.
- **Themed shelf backgrounds (premium).** Per-section themed backgrounds (fridge, dry goods); spices use the custom jar UI instead.
- **Visual pantry shelf (free tier).** Simpler single wood-plank background upgrade for free users, keeping 3-section org as the premium differentiator.
- **Manual section reassignment.** Long-press a misfiled pantry item to move it between sections.
- **Labeled ingredient groups in AI prompt.** Pass pantry data to Claude pre-categorized (Refrigerated/Spices/Dry Goods) instead of a flat list, for better recipe context.

---

## 🎨 UX / Layout

- **ScanReceipt screen redesign (design spec ready).** Keep chips (not a dropdown) for the 3 core meals; add a collapsible "Add-ons ›" row for Sides/Desserts; locked-premium chips get a warm-orange "PRO" pill (not greyed out) + inline 2.5s toast (no modal); remove the 3-step mini illustration from first view (single highest-impact declutter, ~90px/13% of screen).

---

## 💳 Monetization

- **Subscription backend.** Replace hardcoded `IS_PREMIUM = false` with real payment status — Node/Express proxy + Google Play Billing + Apple IAP + Stripe. *Design in from the start:* curated-recipe content unlocks (🆕 New section) and cross-user recipe-popularity aggregation (🆕 New section — thumbs up/down) both need this same backend; build them into the schema/API now rather than retrofitting after payments ship.
- **Gemini API reliability (pre-launch blocker, tied to the backend proxy).** Route calls server-side with a paid key + retry/backoff so free-tier 503s never reach the user. *(Partially addressed already — images now go through a Cloudflare Worker proxy + shared cache per the status note; confirm if this fully closes the item or if meal-gen still needs the same treatment.)*
- **Promo / access codes.** Free premium unlock codes for family/friends/beta testers.
- **Subscription promotions.** First-month-free trial, discounted annual plan, launch-week promo, referral program, seasonal pushes, bundle pricing for future diet tiers.
- **Per-diet multi-menu history.** Store past plans per diet type (capped list) instead of only "current plan."
- **Additional diet types (future tiers).** Whole30, Low-FODMAP, Diabetic-friendly, Heart-healthy, High-protein/athlete — note: Diabetic and Low-Salt already shipped as toggles per the status note, so this list may need pruning.

---

## ✅ Already Resolved (context only, no action needed)

- Claude vs. Gemini decision — resolved (meal-gen/OCR on Claude, images on Imagen via proxy).
- Pricing — $4.99 one-time Pro unlock decided, no subscription at launch.
- Diabetic-friendly / heart-healthy — shipped as toggles.
