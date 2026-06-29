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

1. Pull from branch `claude/git-pull-obhxu4`
2. Read this file in full — all pending adjustments, implementation guidance, and priority order are documented here
3. The dev team (previous session) produced detailed implementation specs for every item on the pending adjustments list — exact code changes, file locations, and QA checklists are all captured above
4. Run `/dev-team-review` to implement all pending adjustments before stress testing
5. Do NOT start with stress test — dev team implements first

---

## Next Session — Planned Review Pipeline

Run in this order:
1. Pantry rebuild (largest edit of the project — see pantry build notes below)
2. Move cuisine type selector to the Home screen
3. Google Play beta testing setup — build Android APK via Expo EAS Build, upload to Play Console internal testing track, invite friends/family by Gmail. Do NOT attempt Android Studio emulator again — use EAS Build + real devices instead.
4. `/dev-team-review` — implement all pending adjustments listed above before any testing
5. `/stress-test` — hammer the fixed build
6. `/dev-team-review` — catch anything the stress test surfaces
7. `/user-panel-review` — **targeted trust check**: we removed health-based statements from the app (legal de-risking, Phase 8). Need to gauge how real users react to the shift in trust signals now that those claims are gone.
