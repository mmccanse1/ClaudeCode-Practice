# Premium Detailed Macros & Nutrients — Feature Spec
**Author:** Marge (licensed nutritionist, spec contributor)
**Date:** 2026-06-28
**Status:** Implementation-ready — for lead engineer

---

## Legal Posture (read first)

All numerical nutrition values are AI-estimated from ingredient lists and standard reference values (USDA FoodData Central conventions). They are **not lab-tested or certified**. Every display surface must carry the one-line disclaimer in Section 6. No therapeutic language anywhere.

---

## 1. Expanded Nutrition JSON — Premium Fields

### Existing FREE fields (do not change)
```json
{
  "calories": 520,
  "protein": 34,
  "carbs": 48,
  "fat": 18,
  "sugar": 6,
  "sodium": 740
}
```
Units: kcal for calories, mg for sodium, g for everything else. All integers, per serving.

### New PREMIUM fields to add
```json
{
  "fiber": 7,
  "net_carbs": 41,
  "saturated_fat": 5,
  "added_sugar": 3,
  "cholesterol": 85,
  "omega_3": 240,
  "potassium": 620,
  "calcium": 110,
  "iron": 3,
  "magnesium": 60,
  "vitamin_d": 2,
  "vitamin_b12": 1
}
```

**Units:**
| Field | Unit | Integer rule |
|---|---|---|
| `fiber` | g | integer |
| `net_carbs` | g | integer; computed as `carbs − fiber` |
| `saturated_fat` | g | integer |
| `added_sugar` | g | integer |
| `cholesterol` | mg | integer |
| `potassium` | mg | integer |
| `calcium` | mg | integer |
| `iron` | mg | integer |
| `vitamin_d` | mcg | integer |

**Computation note for `net_carbs`:** the AI should return it directly as `carbs − fiber` to avoid front-end rounding drift. The front end can verify consistency (net_carbs == carbs − fiber) and flag a mismatch as a data quality warning in dev/debug mode.

### Why these micronutrients and not others

The goal is the highest-signal set for a general meal-planning audience — not a clinical panel.

- **Potassium**: widely under-consumed; relevant to blood pressure context and complements sodium. Requested constantly by users tracking sodium.
- **Calcium**: top-of-mind for dairy-reduced, vegan, and aging adults. Absent from most simple trackers, which makes it a real differentiator.
- **Iron**: critical flag for plant-forward eaters and menstruating adults; frequently asked about.
- **Vitamin D**: near-universally deficient in Western populations; food sources are limited and users notice when a recipe is a meaningful source. Justifies its slot.

- **Magnesium**: broadly under-consumed; relevant to muscle/nerve function and a frequent ask from health-focused users.
- **Vitamin B12**: a key flag for plant-based eaters — a 0 here is genuinely informative on a vegan week, and a real value reassures on others.
- **Omega-3**: a positive marker users actively seek out (fish, flax, walnuts, chia). Reported in **mg** because per-serving amounts are usually well under 1 g, and integer grams would collapse most foods to 0.

Excluded deliberately: Vitamin C (rarely limiting in a full-day diet), Zinc (hard to estimate reliably from ingredients), and the long tail (vitamins A/E/K, selenium, copper, manganese…) where AI estimates add noise, not signal.

---

## 2. Prompt Instruction Text

Add the following block to the Claude recipe-generation prompt when the user has Premium enabled. Insert it immediately after the existing nutrition instruction block.

```
Additionally, for each recipe return an expanded "nutrition_premium" object with the following fields, all as integers, per serving, estimated from standard ingredient reference values:
- fiber (g)
- net_carbs (g) — must equal carbs minus fiber
- saturated_fat (g)
- added_sugar (g) — sugar added during cooking or processing, not naturally occurring
- cholesterol (mg)
- omega_3 (mg)
- potassium (mg)
- calcium (mg)
- iron (mg)
- magnesium (mg)
- vitamin_d (mcg)
- vitamin_b12 (mcg)

Estimate these values using USDA FoodData Central conventions. If a value is trace or effectively zero for this recipe, return 0. Do not return null or omit fields. All values must be plausible for a single serving of the described dish.
```

**Implementation note:** return `nutrition_premium` as a sibling key to the existing `nutrition` object, not nested inside it. This keeps the free/premium data cleanly separated at the API response level and avoids any migration work on existing free-tier parsing.

```json
{
  "nutrition": { ...existing free fields... },
  "nutrition_premium": { ...new premium fields... }
}
```

---

## 3. Free vs. Premium Display Split

### Free panel (always visible)
Display in a single compact row or two-column grid. No grouping headers needed at this level — keep it scannable.

```
Calories    Protein    Carbs    Fat
  520 kcal   34 g      48 g    18 g

Sugar  6 g    Sodium  740 mg
```

### Premium panel (gated, shown below free panel on recipe detail screen)
Organize into three named groups so users can parse at a glance:

**Group A — Carb Detail**
```
Fiber         7 g
Net Carbs    41 g
Sugar         6 g   (free; repeat here for context)
Added Sugar   3 g
```

**Group B — Fat & Cholesterol**
```
Saturated Fat   5 g
Cholesterol    85 mg
Omega-3       240 mg
```

**Group C — Key Micronutrients**
```
Potassium    620 mg
Magnesium     60 mg
Calcium      110 mg
Iron           3 mg
Vitamin D      2 mcg
Vitamin B12    1 mcg
```

**Display recommendations:**
- Group headers in small caps or muted label style — not bold headings.
- Right-align numbers, left-align labels.
- Show units inline (g, mg, mcg) — do not use a separate unit column.
- No % Daily Value bars or RDA percentages. These imply personalization the app does not have and invite health-claim territory. Numbers only.
- Premium panel should be collapsible (default: open) so power users see everything and casual users are not overwhelmed.
- A subtle "Premium" badge or lock icon on the collapsed panel header signals the gate cleanly without a hard paywall interrupt on every recipe.

---

## 4. Diet-Specific Emphasis

When a diet type is active, surface the most relevant premium fields with visual emphasis (e.g. slightly larger text, a subtle highlight, or "most relevant for your diet" label). Do not hide other fields — just signal priority.

| Diet | Emphasize | Rationale |
|---|---|---|
| **Keto** | Net Carbs (primary), Fiber, Saturated Fat | Net carbs is the operative number for ketosis tracking; fiber is the subtractor; sat fat is high on keto so worth flagging |
| **Low-carb** | Net Carbs, Fiber, Sugar | Same carb-tracking logic, softer emphasis than keto |
| **Diabetic-friendly** | Net Carbs, Added Sugar, Fiber | Glycemic load proxies; added sugar is the key lever for blood glucose management |
| **Low-sodium** | (Sodium already free) + Potassium, Magnesium | Potassium and magnesium both offset sodium's blood pressure effect — useful context shown alongside sodium |
| **Vegan** | Calcium, Iron, **Vitamin B12**, Vitamin D, Omega-3, Protein (free field) | The nutrients most commonly limited on vegan diets — B12 especially (often 0 without fortified foods); this is where the premium panel earns its keep for plant-based users |
| **Vegetarian** | Calcium, Iron, Vitamin B12, Vitamin D | Same as vegan but protein concern is lower |
| **High-protein** | Protein (free), Saturated Fat | Confirm protein hit; flag sat fat since high-protein often means high animal fat |
| **Mediterranean** | Fiber, Potassium, Omega-3, Saturated Fat | Fiber, potassium, and omega-3 (fish, olive oil) are positive markers; sat fat is the diet's defining constraint |
| **General / No diet** | Fiber, Potassium | Two of the most under-consumed nutrients in Western diets; broadly relevant |

**Implementation note:** the diet-specific emphasis logic belongs in the display layer (component config), not in the prompt. The AI always returns the full `nutrition_premium` object regardless of diet. The front end then reads `activeDiet` from app state and applies the emphasis mapping.

---

## 5. Free vs. Premium Field Reference (consolidated)

| Field | Tier | Group |
|---|---|---|
| calories | Free | — |
| protein | Free | — |
| carbs | Free | — |
| fat | Free | — |
| sugar | Free | — |
| sodium | Free | — |
| fiber | **Premium** | Carb Detail |
| net_carbs | **Premium** | Carb Detail |
| added_sugar | **Premium** | Carb Detail |
| saturated_fat | **Premium** | Fat & Cholesterol |
| cholesterol | **Premium** | Fat & Cholesterol |
| omega_3 | **Premium** | Fat & Cholesterol |
| potassium | **Premium** | Key Micronutrients |
| magnesium | **Premium** | Key Micronutrients |
| calcium | **Premium** | Key Micronutrients |
| iron | **Premium** | Key Micronutrients |
| vitamin_d | **Premium** | Key Micronutrients |
| vitamin_b12 | **Premium** | Key Micronutrients |

---

## 6. Disclaimer Copy

Use exactly one of these lines. Pick A for in-panel placement, B for a footer/tooltip.

**A (in-panel, below the premium group):**
> Nutrition values are AI-estimated per serving for general guidance only — not medical or dietary advice.

**B (tooltip or footer, shorter):**
> Estimated values. Not medical advice.

Do not use "consult your doctor," "supports health," or any outcomes language. Numbers and the disclaimer. That is the full safe perimeter.

---

## 7. Edge Cases & Engineering Notes

1. **`net_carbs` floor:** if `fiber` is somehow estimated higher than `carbs` (AI hallucination edge case), clamp `net_carbs` to 0 on the front end. Do not display negative net carbs.
2. **`added_sugar` ceiling:** `added_sugar` must always be ≤ `sugar`. Add a front-end guard; flag discrepancy as a data warning in dev mode.
3. **`vitamin_d`:** many recipes will legitimately return 0. That is correct — most whole foods contain negligible vitamin D. Do not suppress zeros; they are informative.
4. **Prompt cost:** the premium nutrition block adds approximately 60–80 tokens to the response per recipe. Factor into cost modeling for the premium tier.
5. **Caching:** premium nutrition fields should be cached alongside free fields in the existing recipe cache. No separate cache key needed.
6. **Legacy recipes:** recipes generated before premium launch will not have `nutrition_premium`. The premium panel should gracefully show a "Not available for this recipe — regenerate to see full detail" message rather than empty fields or zeros.
