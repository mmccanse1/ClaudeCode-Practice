# Pantry Sections — Design Roadmap

**Status:** Architecture decided. 3-section system implemented in `pantryService.ts`.

---

## The Three Sections

| Section | Emoji | What goes here |
|---|---|---|
| Refrigerated | ❄️ | Meat, fish, eggs, dairy, fresh produce, tofu |
| Spices | 🌿 | Dry spices, seasonings, herbs, salt, extracts |
| Dry Goods | 🥫 | Default catch-all: pasta, rice, canned goods, oils, nuts, legumes |

---

## Auto-Categorization (Implemented)

Runs at add-time via `categorizeItem(item: string): PantrySection` in `pantryService.ts`.

**Priority order:**
1. Check spice keywords first (most specific)
2. Check refrigerated keywords second
3. Default to dry_goods

**Key edge cases handled:**
- "garlic powder" → spice (despite "garlic" being in fridge list — spice check runs first)
- "garlic" → refrigerated (no spice match, fridge keyword hit)
- "ground ginger" → spice (explicit keyword)
- "fresh ginger" → refrigerated (no spice match, "ginger" in fridge list)
- "bell pepper" → refrigerated (explicit keyword)
- "black pepper" → spice (explicit keyword, checked before "pepper" hits fridge list)

Works for: manual adds, receipt OCR, barcode scans — all go through `addPantryItem` or `addPantryItems`.

---

## Storage

**New key:** `@meal_planner/pantry_sections_v1`

```json
{
  "refrigerated": ["chicken breast", "eggs"],
  "spices": ["cumin", "paprika"],
  "dry_goods": ["pasta", "canned tomatoes"]
}
```

**Migration:** Migrate-on-read from legacy `@meal_planner/pantry_v1` flat array. Runs once transparently on first read after upgrade. Old key deleted after migration.

**Photo cache:** `@meal_planner/pantry_photos_v1` — flat `{ itemName: url }` map, no change needed.

---

## Future: AI Prompt Enhancement

Once sections are stable, pass labeled groups to `generateMealPlan` instead of a flat array:

```
Available ingredients:
- Refrigerated: eggs, chicken breast, cheddar cheese
- Spices: cumin, smoked paprika, oregano
- Dry Goods: pasta, canned tomatoes, olive oil
```

This lets the AI understand which items are perishable (cook soon), which are flavor agents, and which are bases. Estimated recipe quality improvement especially for spice usage.

**Implementation:** Add optional `categorizedIngredients: CategorizedPantry` parameter to `generateMealPlan` and `regenerateRecipe`. Use flat list as fallback for backward compat.

---

## Future: Manual Section Reassignment

If auto-categorization is wrong, user should be able to long-press an item on PantryShelvesScreen to move it to a different section. Implementation: Alert with 3 section options → call new `moveItem(item, fromSection, toSection)` service function.

---

## Subscription Gating (Not Applicable)

3-section pantry is available to all users on all tiers. It's a core functional improvement, not a premium differentiator.

---

## Files Changed

- `src/services/pantryService.ts` — categorization + 3-section storage
- `src/screens/PantryShelvesScreen.tsx` — 3-section display
- `src/types/index.ts` — `PantrySection`, `CategorizedPantry` types
