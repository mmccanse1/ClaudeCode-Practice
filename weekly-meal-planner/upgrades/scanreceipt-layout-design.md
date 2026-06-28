# ScanReceipt Screen — Layout & UX Design Recommendation

**Prepared by:** Behavioral-UX Specialist + Layout Designer (collaborative brief)
**Scope:** Recommendations only — no code changes. Addresses clutter complaints, progressive disclosure, and the incoming Sides/Desserts + premium locking requirements.

---

## 1. "Which Meals?" — Chips vs. Multi-Select Dropdown

**Verdict: Keep chips. Extend them thoughtfully.**

### Behavioral-UX voice

The chips are doing something the dropdown cannot: they communicate state at a glance without requiring the user to open anything. Bob (67) doesn't have to remember what he chose — he can see it on the card. Maria (58) gets readable hit targets without hunting through a list. The chip interaction is immediate and reversible, which is important for a control that changes how much work the app does (1 meal = 7 recipes; 3 meals = 21 recipes).

A dropdown is the right answer when the list is long (6+ items), mutually exclusive, or rarely changed. None of those apply here. The dropdown would actually increase cognitive friction for the most common action: confirming that Dinner is on and leaving the others off.

The engineer's lean toward chips-for-core is correct. The pressure-test finding: the chips only fail if the row gets too wide. With 3 cores that fits fine; at 5 items (adding Sides + Desserts) a single flat row breaks. Solve that structurally (see section 2) rather than switching control types.

### Layout voice

Current chip row has 3 items at `flex: 1` each — already snug on a 375px iPhone SE viewport. Each chip is 22px emoji + 13px label + 24px padding = roughly 108px minimum. Three fit; five will not. This is the real constraint. The solution is a two-tier chip section, not a dropdown.

**Core meals (3 chips, same row as today):**
```
[ ☀️ Breakfast ] [ 🥗 Lunch ] [ 🍽 Dinner ]
```

**Add-ons (separate row, visually lighter):** — see section 2.

---

## 2. Where Sides & Desserts Go

**Recommendation: A collapsible "Add-ons" row beneath the core chips, revealed with a disclosure chevron.**

### Behavioral-UX voice

Sides and Desserts are not core to the app's primary value (7 dinners for the week). They are embellishments. Burying them as peers of Breakfast/Lunch/Dinner overstates their importance and adds visual weight on first view. The right mental model is: "You're building a menu — want extras?" That's an add-on pattern, not a peer selection.

The collapsible row also solves the premium gating gracefully: a user who taps the chevron sees the add-ons, reads the lock treatment (see section 3), and immediately understands the premium boundary without being ambushed by it.

Keiko (22, design-savvy) will notice and appreciate the clean separation. Bob doesn't need to see it at all — Dinner is enough for him.

### Layout voice

Implementation: directly beneath the core chip row, a single tap target:

```
Add-ons  ›
```

Styled as a small text link (14px, color: #5b7a8c) with a right-pointing chevron that rotates 90° when open. On tap, the add-on row drops in:

```
[ 🥔 Sides  🔒 PRO ] [ 🍰 Desserts  🔒 PRO ]
```

These chips use `flex: 1` across a 2-column row (wider, more breathing room). The locked state is handled by the treatment in section 3.

When free tier buys Pro, the lock glyphs and PRO badges disappear and the chips become interactive. No screen restructuring needed.

**Collapsed height cost: ~22px (one text row).** This is an acceptable addition to the post-source-choice view, where the user has already committed to the flow.

---

## 3. Locked Premium Items — Exact Visual Treatment

This section covers Breakfast and Lunch (locked on free tier) and Sides/Desserts when they ship.

### The core problem to avoid

A disabled-looking chip reads "broken" or "not available right now." A locked chip must read "available — for a price." The difference is intent signaling. Bob must not think the app is glitching.

### Recommended treatment

**Chip appearance (locked state):**
- Background: white (same as unselected) — do NOT use grey/reduced opacity on the chip card itself
- Border: dashed 1.5px, color: #c2d3dd (neutral, not error red, not active blue)
- Emoji: rendered at 70% opacity (subtle visual signal that it's not fully active)
- Label: full opacity, full weight — the text must be readable
- Lock glyph: `🔒` placed inline after the label text, font size 12
- PRO badge: a small pill to the right of the label — 10px bold text, uppercase "PRO", background: #f4a261 (the app's warm accent), white text, border-radius 4px, 4px horizontal padding

**Rendered example:**
```
[ ☀️ Breakfast 🔒 PRO ]
```

The PRO badge in warm orange is the primary signal. The lock glyph is secondary confirmation. The chip is not greyed out, not transparent, not visually collapsed — it's present and readable.

**On tap behavior (non-modal, inline hint):**
Do NOT use `Alert.alert()` — that's an interruption pattern and will feel aggressive to Maria and Bob.

Instead: when a locked chip is tapped, show a small inline toast/banner just below the chip row that fades in and out over 2.5 seconds:

```
Upgrade to Pro to add Breakfast & Lunch menus
```

Styled: background #fff8f0, border #f4a261, rounded 8px, 13px text, color #c07030, with a small "Upgrade →" text link at the end. No modal, no navigation interruption. The user stays on screen.

Optional: if budget allows, add a `Haptics.selectionAsync()` on locked tap — the tiny feedback confirms the tap registered without opening anything.

**Why not a sheet or modal?**
Behavioral reason: modals interrupt flow and signal "something went wrong." At this stage the user is configuring a menu, not entering a purchase flow. The inline toast teaches the user what's possible without hijacking the session. If they want to upgrade, the CTA is there. If they don't, they continue to Dinner only without friction.

---

## 4. Full Reordered Screen — Minimal First View and Expanded View

### State A: Minimal First View (no ingredients loaded, empty pantry)

This is what a first-time user (Bob, Maria) sees when they land on the screen.

```
━━━━━━━━━━━━━━━━━━━━━━━
  Scan Your Receipt
  [subtitle: one sentence max — "Photo your receipt and we'll build your week."]

  [ 📷  Scan with Camera ]    ← primary CTA, full-width, filled blue

  [ 🖼  Upload from Photos ]  ← secondary CTA, full-width, outlined blue
                               (currently missing as a distinct option)

  ─── or ───

  [ 🥗  Start with a sample pantry → ]  ← warm amber outlined
━━━━━━━━━━━━━━━━━━━━━━━
```

**What is removed from current State A:**
- The 3-step mini illustration (📷 → 🤖 → 🍽) — move to an onboarding tooltip or first-time-only modal instead; it adds ~80px of height for little benefit to returning users
- The "Cook from My Pantry" CTA (shown only when pantry has items — current behavior is correct, keep that conditional)

**Why:** Bob sees two clear, obvious buttons. Maria can read them without squinting. Keiko doesn't see a cluttered wall of controls before she's done anything.

---

### State B: Expanded View (after source is chosen — receipt scanned or sample loaded)

The screen expands progressively. The camera button collapses to a small "Scan another receipt →" text link (so it doesn't compete with the ingredient list). The full-width CTA area is replaced by content.

```
━━━━━━━━━━━━━━━━━━━━━━━
  [Title stays]

  [receipt thumbnail, small — 60px tall, right-aligned]  [Scan another →]

  ─── Your ingredients (14) ─────── All / None ───

  [ ✓ chicken breast          ✕ ]
  [ ✓ cherry tomatoes         ✕ ]
  [ ○ eggs                    ✕ ]
  … (FlatList, natural scroll)

  [ + Add item manually ]    [Add]

  ━━━ Which meals? ━━━━━━━━━━━━━━━━━━━━━

  [ ☀️ Breakfast 🔒 PRO ]  [ 🥗 Lunch 🔒 PRO ]  [ 🍽 Dinner ✓ ]
                            Add-ons ›
                            (collapsed by default)

  ━━━ Dietary options ━━━━━━━━━━━━━━━━━━

  [ □ Gluten-Free ]  [ □ Low Salt ]  [ □ Diabetic ]

  ─────────────────────────────────────────
  [ Generate Mediterranean Menu (14 items) → ]   ← primary, full-width, diet color
━━━━━━━━━━━━━━━━━━━━━━━
```

**Key changes from current layout:**
1. The mini step illustration is gone in the expanded state — screen space goes to content
2. The camera button compresses to a text link once ingredients appear
3. "Which meals?" and "Dietary options" stay progressive (only shown after ingredients exist — current behavior, keep it)
4. Add-ons chevron sits directly under the core meal chips row, not as a new section
5. "Add item manually" stays where it is — it's used during the ingredient review phase, not before, so its position is correct

---

## 5. Additional Observations by User Persona

**Bob (67, low-tech):**
The current screen's biggest Bob-problem is that it presents too many options before he's done anything. He reads from top to bottom and has already seen: title, subtitle, 3-step diagram, Scan button, Sample Pantry button, pantry cook button (if applicable) — that's 5–6 things before he acts. State A collapses that to 2 clear buttons. Once he picks one, everything else appears contextually.

On locked chips: Bob needs the PRO badge to be visually distinct from a greyed-out chip. The warm orange PRO pill on a white chip is readable and suggests "I could tap this" rather than "this is dead."

**Maria (58, readability):**
The current 12px `pantryHint` italic copy ("Checked items go into your menu and are saved to your pantry") is too small and low-contrast for comfortable reading. In State B, consider bumping hint copy to 13px and using #3a5663 (darker variant of the current hint color) instead of #5b7a8c.

The inline locked toast copy should be 14px, not 12px — this is a message she needs to read, not a decorative label.

**Keiko (22, design-savvy):**
The current screen's inconsistency is the biggest tell — the camera button is a filled card; the sample pantry button is an outlined card with an orange border; the pantry cook button is an outlined card with a diet-color border. Three different button styles for three peer-level actions signals an unfinished design system. Unify: primary action = filled blue; secondary actions = outlined, consistent border color (#dbe9f0 default, not orange). Reserve orange (#f4a261) for PRO/upgrade signals only — it's a meaningful semantic color.

---

## 6. Single Highest-Impact Decluttering Move

Remove the 3-step mini illustration from the first view and replace it with nothing — just breathing room. That card occupies approximately 90px of height on a 667px screen (13% of the visible area) and is ignored on every return visit. Replace it with a contextual first-time-only hint (show once, mark seen in AsyncStorage) or drop it entirely and let onboarding handle it. This single change makes the screen feel uncluttered before any other work is done.

---

## Summary (3-line brief for the lead engineer)

**Chips verdict:** Keep chips for the 3 core meals — a dropdown adds a tap and hides state that users benefit from seeing. The engineer's lean is right.

**Highest-impact declutter:** Remove the 3-step mini illustration from the main screen flow — it consumes 90px on every return visit and the screen's flow already communicates the steps implicitly.

**Sides/Desserts + locking:** Add-ons go in a collapsible chevron row directly below the core chips; locked premium chips use a warm orange "PRO" pill badge (not grey-out) with an inline 2.5s toast on tap — no modal, no navigation interrupt.
