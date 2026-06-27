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
- **Dinner protein rule**: Dinners must include a meat protein when the selected diet type permits it — eggs are explicitly excluded from dinner protein
- **Macros missing**: Numerical macro values (calories, protein, carbs, fat) are not displaying — this is likely an unintended consequence of the Phase 8 legal copy changes. Numerical values are fine to show; only health *claim* language was removed. Restore macros.
- **Pantry deduplication (storage fix)**: When a receipt is scanned, recurring items (e.g. milk, eggs) must be matched against existing pantry entries and quantities updated — not added as new entries. Accumulating duplicate entries also bloats cached image/data storage over time. Add a catch-guard on receipt scan: if item already exists in pantry, increment quantity; do not create a duplicate.

### Future Considerations (Deferred)
- **User Accounts + Allergy Profiles**: Allow users to create accounts and input dietary allergies so the app can filter recipes and meal plans accordingly. Deferred — revisit if/when pursuing formal health advice legitimization.

---

## Next Session — Planned Review Pipeline

Run in this order:
1. `/dev-team-review` — implement all pending adjustments listed above before any testing
2. `/stress-test` — hammer the fixed build
3. `/dev-team-review` — catch anything the stress test surfaces
4. `/user-panel-review` — **targeted trust check**: we removed health-based statements from the app (legal de-risking, Phase 8). Need to gauge how real users react to the shift in trust signals now that those claims are gone.
