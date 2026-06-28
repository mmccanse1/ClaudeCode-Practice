# Sides & Desserts — Premium Content Spec
**Author:** Erika (sous chef, Felidia / NYC)
**Date:** 2026-06-28
**Status:** Implementation-ready spec — do not modify app code, pass to lead engineer

---

## 1. How They Fit the Model

### Recommendation: Option (b) — Add-On Courses, Not Full 7-Day Sets

**Do not generate 7 sides and 7 desserts.** That balloons a premium week to 28 recipes, which is unmanageable for a home cook pulling from a single grocery haul. The meal is already the load-bearing unit; sides and desserts are supporting cast.

**Recommended cadence:**
- **Sides:** 5 per week (Mon–Fri; weekends are flex days or use leftovers)
- **Desserts:** 3 per week (e.g., one early-week, one mid-week, one weekend treat)

**Why this cadence:**
- 5 sides aligns with the dinner meal — most users don't need a formal side at breakfast or lunch.
- 3 desserts feels like a treat without demanding daily baking. It also reduces premium ingredient strain (nut flours, specialty sweeteners, coconut cream) across the week.
- Both numbers are small enough to fully source from the user's existing pantry + receipt scan without requiring a second shopping trip.
- The asymmetry (5 sides, 3 desserts) signals sides as utility and desserts as occasion — which is how real meal planning actually works.

**UI placement suggestion (for engineer):**
On the meal-type selector screen, add "Sides (5)" and "Desserts (3)" as togglable premium add-ons below the main Breakfast / Lunch / Dinner cards, labeled with a lock icon until unlocked.

---

## 2. Prompt Modules

### 2a. SIDES Prompt Module

```
SIDES DIRECTIVE

You are generating 5 side dishes for the week. Each side should complement a dinner-style main without competing with it — think of a side as the thing that makes the plate feel complete.

CORE RULES:
- Generate exactly 5 sides, one per weekday (label Mon–Fri or Side 1–5).
- Every side must be buildable from the user's pantry staples plus their listed groceries. Do not introduce ingredients that appear nowhere in either list.
- No two sides in the same week may share the same base vegetable, grain, or legume. Variety is mandatory.
- Sides must complement the week's dinner flavors directionally — if dinners skew Mediterranean (olive oil, lemon, herbs), sides lean that way too. Do not force fusion clashes.
- Each side should take 30 minutes or less, active cooking time.
- Provide: name, ingredients with quantities, method (5–8 steps), and one pairing note ("pairs well with [dinner X]").
- Avoid repetition of cooking method across the week — do not roast every side. Rotate across: roasted, sautéed, steamed, raw/dressed, braised.

DIETARY CONSTRAINTS:
Apply the active diet strictly. See diet-specific guidance below. When a modifier (Gluten-Free, Low Salt, Diabetic) is active, apply it on top of the base diet — do not relax either constraint.

OUTPUT FORMAT:
Return 5 side dish objects in JSON matching the app's existing recipe schema. Include: title, ingredients[], steps[], pairingNote, prepTime, cookTime, dietTags[].
```

---

### 2b. DESSERTS Prompt Module

```
DESSERTS DIRECTIVE

You are generating 3 desserts for the week. Desserts are a premium treat — they should feel intentional and satisfying, not like an afterthought. Build them from what the user already has; do not invent specialty ingredients.

CORE RULES:
- Generate exactly 3 desserts, spaced across the week (suggest: Day 2, Day 4, Day 7 or similar).
- Every dessert must be buildable from the user's pantry staples plus their listed groceries. No phantom ingredients.
- No two desserts in the same week may use the same hero ingredient (e.g., do not make two chocolate desserts, two apple desserts). Variety across fruit, chocolate, nut/seed, and custard/cream families is required.
- No two desserts may share the same format (e.g., do not make two baked goods, two frozen items). Rotate across: baked, chilled/no-bake, stovetop/pan.
- Portion guidance: home-scale (4–6 servings). These are weeknight desserts, not restaurant plating.
- Provide: name, ingredients with quantities, method (5–10 steps), and one flavor note explaining what makes it satisfying.
- For keto, diabetic, and paleo diets: added sugar is either eliminated or replaced — see diet-specific guidance. Do not use standard refined sugar in these cases.

DIETARY CONSTRAINTS:
Apply the active diet strictly. Desserts are where diet breakdowns most commonly occur — enforce sugar, grain, and dairy rules with extra care. See per-diet guidance below.

OUTPUT FORMAT:
Return 3 dessert objects in JSON matching the app's existing recipe schema. Include: title, ingredients[], steps[], flavorNote, prepTime, cookTime, dietTags[], sweetnessSource (e.g., "erythritol + dark chocolate", "maple syrup", "medjool dates").
```

---

## 3. Diet-Appropriate Guidance

### 3a. Mediterranean

**Sides — concrete examples:**
- Roasted zucchini with lemon zest and fresh mint
- White bean salad with parsley, olive oil, and shaved red onion
- Braised Swiss chard with garlic and Calabrian chili
- Warm lentil salad with caramelized shallots and cumin vinaigrette
- Sautéed broccolini with anchovy butter and toasted breadcrumbs (sub GF breadcrumbs if needed)

**Desserts — concrete examples:**
- Olive oil cake with orange zest and a honey drizzle
- Poached pears in red wine with cinnamon and star anise
- Greek yogurt panna cotta with thyme-infused honey and crushed pistachios

**Notes:** Mediterranean allows whole grains, legumes, dairy in moderation, and natural sweeteners (honey, maple, dried fruit). No hard sugar restrictions — keep refined sugar moderate, lean on fruit and honey.

---

### 3b. Keto

**Trickiest diet case for desserts — see Section 3f for full treatment.**

**Sides — concrete examples:**
- Roasted cauliflower with brown butter and capers
- Zucchini ribbons with pesto, toasted pine nuts, and shaved Parmesan
- Sautéed spinach with garlic, cream, and nutmeg (creamed spinach)
- Crispy Brussels sprouts with bacon lardons and apple cider vinegar
- Roasted radishes with herbed butter (radishes become mild and potato-like when roasted)

**Sides hard rules:** No grains, no legumes, no starchy vegetables (potatoes, corn, peas, winter squash). No added sugar anywhere. Fat-forward is correct.

**Desserts — concrete examples:**
- Dark chocolate (85%+) bark with toasted almonds and flaky salt
- Keto cheesecake mousse with erythritol, cream cheese, and fresh raspberries
- Coconut cream panna cotta with a berry coulis (sweetened with erythritol or monk fruit)

**Desserts hard rules:** No refined sugar. No grains or grain-based crusts. Approved sweeteners: erythritol, monk fruit, allulose, stevia. Berries are the safest fruit (low net carb). Avoid honey, maple, dates, and all sugar alcohols that spike blood glucose (maltitol).

---

### 3c. Paleo

**Sides — concrete examples:**
- Roasted sweet potato wedges with smoked paprika and fresh cilantro
- Simple green salad with avocado, cucumber, and a lemon-tahini dressing
- Roasted beets with orange juice, walnuts, and fresh thyme
- Steamed broccoli with almond butter drizzle and crushed red pepper
- Sautéed mushrooms with fresh rosemary, garlic, and olive oil

**Sides hard rules:** No grains (no rice, pasta, bread, oats). No legumes (no beans, lentils, chickpeas, peanuts). No dairy. Natural starchy vegetables (sweet potato, beets, parsnips, squash) are fine.

**Desserts — concrete examples:**
- Baked cinnamon apples with almond butter, walnuts, and coconut sugar
- Medjool date energy balls with almond flour, cocoa powder, and shredded coconut
- Banana "nice cream" blended with almond butter and cacao nibs (frozen banana base)

**Desserts hard rules:** No refined sugar. Approved sweeteners: raw honey, maple syrup, medjool dates, coconut sugar, fresh fruit. No grains (no all-purpose flour, oat flour, etc.) — almond flour and coconut flour are fine. No dairy — coconut cream, coconut milk, and nut milks are fine.

---

### 3d. Vegetarian

**Sides — concrete examples:**
- Roasted cherry tomatoes with burrata and fresh basil
- Grilled corn off the cob with lime, cotija, and chili (elote-style)
- Mushroom fricassee with fresh thyme and a splash of dry white wine
- Roasted delicata squash with sage brown butter and Parmesan
- Cucumber ribbon salad with rice vinegar, sesame oil, and toasted sesame seeds

**Sides notes:** Full latitude on dairy and eggs. Lean on umami from cheese, mushrooms, and fermented items. No meat stocks — use vegetable broth.

**Desserts — concrete examples:**
- Classic butter cake with lemon curd and fresh berries
- Chocolate pudding with whole milk, dark chocolate, and a pinch of cayenne
- Ricotta and honey tart with an almond flour crust and fresh figs

**Desserts notes:** No restrictions beyond excluding meat. Full dairy and egg access means richer, classic dessert formats are available.

---

### 3e. Vegan

**Sides — concrete examples:**
- Roasted chickpeas with smoked paprika, cumin, and a squeeze of lemon
- Miso-glazed eggplant (nasu dengaku style) with scallion and sesame
- Raw shredded kale salad with tahini-lemon dressing and dried cranberries
- Coconut-braised collard greens with garlic and red pepper flakes
- Black bean salad with roasted corn, avocado, and a lime-cumin vinaigrette

**Sides hard rules:** No dairy, no eggs, no honey, no meat-based stocks. Check that umami sources are vegan (some Worcestershire sauces contain anchovies; use tamari or vegan Worcestershire).

**Desserts — concrete examples:**
- Coconut milk rice pudding with cardamom, mango, and toasted coconut flakes
- Aquafaba chocolate mousse — whipped chickpea liquid folded with melted dark chocolate and vanilla
- Baked banana bread muffins with almond flour, flaxseed egg, and maple syrup

**Desserts hard rules:** No dairy (no butter, cream, milk, yogurt). No eggs — use flax egg (1 tbsp ground flaxseed + 3 tbsp water per egg) or aquafaba (3 tbsp per egg) as binders. No honey — use maple syrup, agave, or medjool dates. Verify dark chocolate is dairy-free (many are; check label).

**Key technique note for engineer's prompt:** Flag aquafaba as a pantry-available ingredient when the user has canned chickpeas — this unlocks an entire class of vegan desserts that would otherwise require an egg substitute purchase.

---

### 3f. Keto + Diabetic Desserts — The Trickiest Case (Full Treatment)

These two diets share the hardest dessert constraints and partially overlap, but are not identical:

**Keto:** strict carb ceiling (typically <20g net carbs/day across all food). Any dessert must fit within that ceiling after accounting for the day's meals.

**Diabetic:** glycemic impact is the driver, not total carbs alone. Some moderate-GI foods (oats, legumes) that are off-limits for keto may be acceptable for diabetic in small portions. However, refined sugar and high-GI starches are always off.

**Where they overlap:**
- Both forbid: refined sugar, white flour, honey, maple syrup, dates, and most tropical fruits (mango, banana, pineapple)
- Both allow: berries (strawberries, raspberries, blackberries — lowest GI fruits), dark chocolate (70%+ for diabetic, 85%+ for strict keto), nuts and seeds as the base, erythritol and monk fruit sweeteners
- Cooking fat: keto leans into cream cheese, heavy cream, butter; diabetic prefers these in moderation

**Where they diverge:**
- Keto allows high-fat dairy freely; diabetic should moderate saturated fat
- Diabetic can use small amounts of oat flour or whole-grain bases in some desserts; keto cannot
- Diabetic can use a larger berry portion (higher natural sugar is acceptable if GI is low); keto must count net carbs even from berries

**Sweetener guidance for both:**
- Best: erythritol, allulose, monk fruit — do not spike blood glucose, zero glycemic index
- Acceptable: stevia (slightly bitter aftertaste; works in chocolate applications)
- Avoid for both: maltitol (raises blood glucose nearly as much as sugar), sorbitol (moderate GI, GI distress at volume), regular agave (high fructose despite low GI score)

**Concrete dessert examples that work for BOTH keto and diabetic simultaneously:**
1. Raspberry dark chocolate bark — melted 85% dark chocolate spread thin, fresh raspberries pressed in, flaky salt, refrigerated until set. Sweetener: none needed (chocolate provides enough). Net carbs per serving: ~4g.
2. Cheesecake-stuffed strawberries — hulled fresh strawberries filled with cream cheese + erythritol + vanilla. No baking, no crust. Net carbs per serving: ~5g.
3. Almond flour brownies — almond flour base, 85% dark chocolate, eggs (or flax egg for vegan), erythritol, vanilla. Fudgy, satisfying, no grain spike. Net carbs per serving: ~6g.

**Prompt instruction for engineer:** When the active diet is Keto or Diabetic (or both as stacked modifiers), inject the following hard constraint into the desserts module:

```
SWEETENER CONSTRAINT (Keto / Diabetic active):
- Do not use refined sugar, honey, maple syrup, agave, dates, or any high-GI sweetener.
- Approved sweeteners only: erythritol, allulose, monk fruit, stevia.
- Do not use maltitol or sorbitol.
- Keep total net carbs per dessert serving under 8g.
- Fruit: berries only (strawberries, raspberries, blackberries, blueberries in moderate portion).
- Chocolate: 70% cacao minimum for Diabetic; 85% minimum for Keto.
- Include "sweetnessSource" field in output — name the specific sweetener used so the user can verify.
```

---

## 4. Pairing Logic

**Keep it lightweight — do not over-engineer.**

The goal is directional coherence, not a formal pairing matrix. A few rules of thumb are enough:

**Rule 1 — Regional family:** If a dinner is Italian (e.g., chicken piccata), pair it with a side from the same flavor family (roasted broccolini with lemon and garlic, not miso-glazed eggplant). The prompt module should instruct the AI to read the week's dinner list first and cluster sides by dominant flavor profile.

**Rule 2 — Texture contrast:** If a dinner is rich and braised (short ribs, lamb ragu), the side should be fresh, bright, or acidic — not another heavy preparation. If a dinner is lean and grilled, the side can carry more fat and weight. Instruct the prompt to flag the dinner's cooking method before selecting side prep.

**Rule 3 — Avoid doubling the starch:** If a dinner already contains pasta, rice, or potatoes, the side should be vegetable-forward, not another starch. This rule matters most for Mediterranean and Vegetarian diets where grain sides are freely available.

**Rule 4 — Dessert as a week-ender, not a chaser:** Do not automatically pair a dessert to a specific dinner. Instead, assign desserts to days where the dinner is lighter (a salad-based dinner, a soup night) so the user gets overall caloric balance without explicit tracking. The prompt can simply be instructed: "Assign desserts to days where the dinner is listed as light or soup/salad-based. If no such days exist, distribute evenly."

**Rule 5 — Flavor bridge:** For the one weekend dessert, allow it to call back to a dominant flavor from the week's cooking — e.g., if the week was heavy on citrus, a lemon posset or orange olive oil cake feels like a satisfying close rather than a non-sequitur.

**What NOT to do:** Do not build a full pairing matrix (side X goes with dinner Y) in the prompt. That increases token length and creates rigid outputs that fail when ingredient availability changes. Trust directional rules; the model will fill in the specifics.

---

## Engineer Implementation Notes

- The `sweetnessSource` field is new and specific to Desserts — add it to the recipe schema for dessert-type records only. It should be a nullable string on non-dessert records.
- The `pairingNote` field is new and specific to Sides — same approach, nullable on other record types.
- Sides and Desserts should share the same recipe rendering component as Breakfast/Lunch/Dinner (card + detail view). No new UI component needed — just extend `dietTags[]` with `"side"` and `"dessert"` type tags for filtering.
- Diet modifier stacking (e.g., Keto + Gluten-Free, Diabetic + Low Salt) should apply all constraints simultaneously. The dessert sweetener constraint block (Section 3f) should be injected as a separate system-prompt segment when either Keto or Diabetic is active, not inlined into the base dessert directive — keeps it modular and avoids prompt bloat on other diets.
- Pantry hint: when user has canned chickpeas in pantry and active diet is Vegan, surface aquafaba as an available ingredient in the dessert module context. This is a cheap but high-value unlock.
