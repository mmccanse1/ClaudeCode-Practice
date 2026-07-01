# Friday Review Agenda — Condensed Bullet List

Consolidated from live testing notes (today) + everything in `weekly-meal-planner/upgrades/`. Organized for item-by-item discussion — nothing here has been implemented yet.

---

## 🆕 New — From Today's Testing Session

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

- **Pantry item categorization is broken — flagged before starting the visuals rebuild**
  - Live examples found scrolling the pantry: frozen pizza → Dry Goods, crispy fried onions → Refrigerated, (salted/unsalted) butter → Spices & Seasonings.
  - Root cause (confirmed in `pantryService.ts` `categorizeItem()`): pure substring keyword-matching across only 3 fixed buckets (spices → refrigerated → dry_goods, first match wins, in that priority order).
    - Butter: `SPICE_KEYWORDS` includes the bare word `'salt'` — "salted butter" / "unsalted butter" both contain "salt" as a substring, so they get caught by the spice check before the fridge list's `'butter'` entry is ever reached.
    - Crispy fried onions: `'onion'` is a `FRIDGE_KEYWORDS` entry meant for fresh onions, but it substring-matches inside "fried onions" even though the product is a shelf-stable jarred/canned topping.
    - Frozen pizza: doesn't match any spice or fridge keyword, so it falls through to the `dry_goods` default — and there's no "frozen" bucket in the taxonomy at all (only refrigerated / spices / dry_goods exist), so even a targeted fix needs a 4th section, not just a keyword tweak.
  - Flagging this now because the visuals rebuild is about to start — rebuilding pantry shelf visuals on top of this categorization logic will just make the wrong-bucket problem more visible, not fix it. Worth deciding before the rebuild: patch the keyword lists (quick, still fragile for other compound product names) vs. add a `frozen` section + smarter matching (e.g., check for whole-word/prefix matches instead of raw substrings, or route through AI-based categorization at scan time instead of local keywords).
  - **Not scan-specific — confirmed it's a single choke point.** All three entry paths call the same `categorizeItem()`: manual typed entry (`PantryScreen.handleAdd` → `addPantryItem`), barcode scan (`PantryScreen.handleScanAdd` → `addPantryItem`), and receipt scan (`ScanReceiptScreen` → `addPantryItems`, batch version). There is no separate categorization logic per input method, so a manually-typed "salted butter" miscategorizes exactly the same way a scanned one does. Any fix needs to happen once, in `categorizeItem()` itself, not per-entry-point.
  - **Owner-confirmed expected result (test case for the fix):** "salted butter" → Refrigerated, not Spices & Seasonings. Any keyword-priority fix (e.g., checking fridge keywords before the generic `'salt'` spice match, or requiring word-boundary matches instead of raw substrings) should be checked against this case directly.

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

- **Subscription backend.** Replace hardcoded `IS_PREMIUM = false` with real payment status — Node/Express proxy + Google Play Billing + Apple IAP + Stripe.
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
