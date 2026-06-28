# World Cuisine Modules — Implementation Spec
**Author:** Gladys (retired head chef, HoJo kitchens + intimate restaurant)
**Date:** 2026-06-28
**Purpose:** Premium v2 content — paste-ready system-prompt modules for each cuisine. These stack on top of existing diet modules (Vegetarian, Vegan, Keto, etc.). Where a diet restriction applies, the cuisine module defers to that diet's rules — the cuisine shapes *how* the food is cooked and spiced, the diet shapes *what* goes in.

---

## How to Layer These

The cuisine module slips in alongside the diet module in the system prompt. Rough order:

```
[Diet module — e.g. Indian Vegetarian]
[Cuisine module — Indian / South Asian]
[Weekly variety rules — from cuisine module below]
```

When diet is "Any / No preference," the cuisine module stands alone. When a user picks "Indian Vegetarian," the Vegetarian diet module's protein rules (legumes, tofu, dairy, eggs) govern; the Indian cuisine module governs spice profiles, techniques, and dish categories. The cuisine module should never override a hard dietary restriction.

---

## 1. Indian / South Asian

### Signature Spices & Aromatics
Cumin (seeds and ground), coriander (seeds and ground), turmeric, garam masala, mustard seeds, curry leaves (fresh or dried), fenugreek seeds, dried red chiles, cardamom (green and black), cloves, cinnamon stick, asafoetida (hing), ginger (fresh), garlic, green chiles, fresh cilantro. Kashmiri chile powder for red color without scorching heat. Amchur (dried mango powder) for sour lift.

### Pantry Staples
- **Grains/legumes:** Basmati rice, whole wheat or AP flour (for roti), red lentils (masoor dal), yellow split peas (chana dal), black lentils (urad dal), chickpeas (canned or dried), kidney beans (rajma)
- **Oils/fats:** Neutral oil (sunflower, canola) for everyday cooking; ghee for finishing and tempering
- **Canned/jarred:** Canned diced tomatoes, coconut milk, tomato paste
- **Dairy:** Plain whole-milk yogurt (marinade, sauce base, raita), paneer (fresh cheese — can be made at home from milk + lemon)
- **Other:** Tamarind paste or concentrate, dried fenugreek leaves (kasuri methi), chat masala

### Typical Proteins
Chicken (thighs preferred — holds up to braises), lamb, shrimp, eggs.
**Vegetarian swaps:** Paneer, chickpeas, lentils of any color, kidney beans, tofu (absorbs well in heavily spiced sauces).
**Vegan swaps:** All legumes, tofu, potatoes + cauliflower as bulk.

### Core Techniques
- **Tadka / tempering:** Heat oil or ghee, add whole spices (mustard seeds, cumin seeds, dried chile) until they pop and bloom — 30–60 seconds — then pour over a finished dal or into a sauce base. Unlocks fat-soluble flavor compounds. This is not optional in Indian cooking; it is the technique.
- **Bhuno:** Fry onion, ginger, garlic, and tomato together over medium-high heat, stirring constantly, until the masala "leaves oil" (you see fat separating around the edges). This concentrates flavor and removes raw taste. Most curries begin here.
- **Pressure cook / slow braise:** Lentils and legumes need either a pressure cooker (Instant Pot is fine) or a long covered simmer. Plan for it.
- **Dry-roast whole spices:** Before grinding, toast cumin and coriander seeds in a dry pan until fragrant, then grind. Better flavor than pre-ground.
- **Marinate in yogurt:** Especially for chicken and lamb — tenderizes and carries spice into the meat (minimum 30 min, up to overnight in fridge).

### Example Dishes (Easy → Ambitious)
1. Masoor dal (red lentil soup) with tadka — 25 minutes, beginner-friendly
2. Chana masala (chickpea curry) — weeknight staple, canned chickpeas fine
3. Aloo gobi (potato and cauliflower stir-fry, dry style)
4. Butter chicken (murgh makhani) — yogurt-marinated chicken in tomato-cream sauce
5. Saag paneer (spinach gravy with fresh cheese)
6. Rajma (kidney bean curry, North Indian style) — slow braise, rewarding
7. Lamb rogan josh (Kashmiri braised lamb) — weekend cook, full-flavored
8. Dal makhani (black lentils + kidney beans, long-simmered overnight style)

### System Prompt Module — Indian / South Asian

```
Cuisine principles — Indian / South Asian:
- Build flavor with a bhuno base: cook onion, ginger, garlic, and tomato over medium-high heat until the masala leaves oil before adding protein or vegetables.
- Use tadka (tempering whole spices in hot oil or ghee) at least once in the week — it is the backbone of Indian dal and vegetable dishes.
- Spice profile draws from: cumin, coriander, turmeric, garam masala, mustard seeds, cardamom, dried red chiles, fresh ginger, fresh garlic, and fresh cilantro as a finish.
- Incorporate a lentil or legume dish at least twice per week (dal, chana masala, rajma) — these are central to Indian home cooking, not side dishes.
- Include at least one dry-style dish (sabzi/stir-fry, e.g. aloo gobi) alongside sauced dishes to vary texture.
- Serve with basmati rice or whole wheat flatbread (roti/chapati) — note which in the recipe so the user knows what to prep.
- Plain yogurt is a recurring ingredient (marinade, raita, sauce base) — flag if the user's diet excludes dairy.
- [DEFER to diet module for protein choices: Vegetarian/Vegan rules override protein suggestions; Keto reduces rice/legume portions.]

Strict variety rules:
- Do not repeat the same spice base more than twice in one week (e.g., do not make both butter chicken and tikka masala — they share the same tomato-cream-garam masala profile).
- Alternate between sauced dishes (curries, dals) and dry-cooked dishes (stir-fry, flatbreads, roasted vegetables) — no more than three sauced dishes in a row.
```

---

## 2. East Asian (Chinese home cooking / Japanese everyday / Korean)

This one I'm splitting into a shared "East Asian" module with cuisine-specific sub-notes, because they share pantry infrastructure but diverge in technique and flavor. An engineer can split them into three separate modules if the product goes that route — the bones are here either way.

### Signature Spices & Aromatics

**Chinese:** Ginger (fresh), garlic, scallions, five-spice powder, Sichuan peppercorns (for numbing heat), dried red chiles, star anise, oyster sauce, doubanjiang (chili bean paste), fermented black beans.
**Japanese:** Ginger, scallions, mirin, sake (or dry sherry), dashi (kombu + bonito), sesame seeds and sesame oil, shichimi togarashi.
**Korean:** Gochugaru (Korean red pepper flakes — essential, not optional), gochujang (fermented chile paste), doenjang (fermented soybean paste), garlic (a lot), ginger, sesame oil, toasted sesame seeds, scallions, perilla leaves if available.

### Pantry Staples
- **Grains/noodles:** Short-grain rice (Japanese style), long-grain or jasmine rice, rice noodles, soba, udon, dried ramen noodles, glass noodles
- **Sauces/condiments:** Soy sauce (regular and low-sodium), dark soy sauce (for color in braises), rice vinegar, mirin, sake or dry sherry, sesame oil (finishing, not cooking), oyster sauce, fish sauce, hoisin
- **Fermented/preserved:** Gochujang, doenjang or miso paste, kimchi (use as ingredient), doubanjiang, fish sauce
- **Oils:** Neutral oil (vegetable or canola) for wok cooking; sesame oil only as finishing
- **Tofu:** Firm (stir-fry, soup), silken (miso soup, Korean sundubu), extra-firm (pan-fry)
- **Other:** Cornstarch (thickener and coating), dried seaweed (nori, kombu), sesame seeds

### Typical Proteins
Pork (belly, shoulder, ground), chicken thighs, beef (flank, chuck for braises), shrimp, salmon, tofu, eggs.
**Vegetarian/vegan swaps:** Tofu (every style), mushrooms (shiitake, oyster, king trumpet — meaty texture), edamame, tempeh absorbs Korean marinades well.

### Core Techniques
- **Wok hei (breath of the wok):** High heat, small batches, constant movement. If using a home burner, don't overcrowd — cook in batches or you steam instead of sear. A hot cast-iron skillet is a decent substitute.
- **Velveting:** Toss protein in cornstarch + egg white (or baking soda + water) and let rest 15 minutes before stir-frying. Results in silky, restaurant-quality texture. Chinese technique, applies broadly.
- **Dashi stock (Japanese):** Steep kombu in cold water, heat to just-below-simmer, add bonito flakes, steep 5 minutes, strain. Foundation of miso soup, ramen broth, noodle dishes. Takes 20 minutes and transforms the result.
- **Fermented paste base (Korean):** Doenjang or gochujang as the first thing into the pot, briefly fried in a little oil before adding liquids. Builds depth fast.
- **Braise with soy + sugar + aromatics:** Standard across all three — soy sauce, mirin or sugar, sake or water, ginger, garlic. Works on pork belly, chicken thighs, tofu, eggs.
- **Banchan mindset (Korean):** Korean meals are built around a central dish plus several small side dishes — kimchi, pickled vegetables, seasoned spinach. A recipe set should occasionally include a banchan cluster rather than one hero dish.

### Example Dishes (Easy → Ambitious)

**Chinese-style:**
1. Egg fried rice (pantry dish, fast)
2. Mapo tofu (silken tofu in doubanjiang-ginger sauce)
3. Red-braised pork belly (hong shao rou) — slow, low effort, stunning

**Japanese-style:**
4. Miso soup with tofu and wakame
5. Teriyaki chicken thighs (20-minute weeknight)
6. Nikujaga (meat and potato stew, Japanese comfort food)

**Korean-style:**
7. Kimchi fried rice
8. Doenjang jjigae (fermented soybean paste stew with tofu and zucchini)
9. Japchae (glass noodles with vegetables and beef) — assembly dish, moderate effort
10. Dakgalbi (spicy stir-fried chicken with gochujang) — accessible, crowd-pleaser

### System Prompt Module — East Asian

```
Cuisine principles — East Asian (Chinese / Japanese / Korean):
- Soy sauce, sesame oil (finishing only), rice vinegar, and fresh ginger/garlic are the flavor foundation shared across all three traditions.
- Chinese dishes: build around wok techniques — high heat, small batches, velveting proteins in cornstarch before stir-frying. Use oyster sauce and/or doubanjiang for depth.
- Japanese dishes: favor dashi-based broths (kombu + bonito steep, 20 minutes), mirin and sake for sweetness and umami, and clean presentation with minimal sauce.
- Korean dishes: gochugaru and/or gochujang are non-negotiable for authentic flavor. Doenjang (fermented soybean paste) anchors soups and stews. Sesame oil and sesame seeds finish most dishes.
- Include at least one rice dish and one noodle or broth-based dish across the week.
- Tofu is a full protein in this cuisine tradition — not a substitute, a centerpiece. Use it in at least one dish per week.
- Fish sauce and oyster sauce contain shellfish/fish — flag for vegan and severe-allergy diets and substitute with soy sauce or mushroom sauce.
- [DEFER to diet module for protein exclusions. Vegan: replace fish sauce with soy sauce or mushroom sauce; omit oyster sauce. Keto: skip noodles and rice, serve stir-fries over cauliflower rice or straight.]

Strict variety rules:
- Do not make more than two stir-fries in one week. Balance with braises, soups, and steamed or simmered dishes.
- Vary the regional tradition: do not cook only Chinese-style or only Korean-style for the full week. Include dishes from at least two of the three traditions (Chinese, Japanese, Korean).
```

---

## 3. Middle Eastern

### Signature Spices & Aromatics
Cumin (seeds and ground), coriander, sumac (tart, fruity — finishing spice), za'atar (herb blend — thyme, sesame, sumac), allspice, cinnamon (used in savory dishes — don't skip it), paprika (sweet and smoked), turmeric, dried oregano, fresh flat-leaf parsley, fresh mint, garlic, lemon (juice and zest used constantly), tahini (sesame paste — not optional).

### Pantry Staples
- **Grains/legumes:** Pita or flatbread, bulgur wheat, couscous (quick pantry grain), white or brown rice, chickpeas (canned, used constantly), green lentils, red lentils
- **Oils:** Olive oil — use it generously, this cuisine doesn't shy from fat
- **Sauces/condiments:** Tahini, pomegranate molasses (adds sweet-tart depth to marinades and salads), tomato paste, canned diced tomatoes
- **Nuts/dried fruit:** Pine nuts (toasted, for garnish and stuffing), almonds, raisins or dried apricots (appear in savory rice dishes), walnuts
- **Dairy:** Plain yogurt (sauce, marinade, side), labneh (strained yogurt — thick, used as a spread)
- **Other:** Dried rose petals (optional, Persian influence), preserved lemon (Moroccan influence)

### Typical Proteins
Lamb (the regional default — ground, braised, or grilled), chicken (thighs for braises, whole legs for roasting), beef (ground for kofta and stuffed dishes), fish (white fish in Lebanese and Egyptian traditions), eggs (shakshuka is a main dish here).
**Vegetarian/vegan swaps:** Chickpeas in every form (roasted, stewed, hummus), falafel (ground chickpea fritters — homemade is achievable), stuffed bell peppers with rice and herbs, lentil-based dishes like mujaddara.

### Core Techniques
- **Bloom spices in hot oil:** Similar to Indian tadka but briefer — add cumin and coriander to hot olive oil before adding onion. Opens the fat-soluble aromatics fast.
- **Long-roast lamb or chicken:** Low oven, lots of spice rub, resting time. Middle Eastern braises are often finished in the oven, not just on the stovetop.
- **Hummus from scratch:** Dried chickpeas soaked and cooked soft (or good canned chickpeas), tahini, lemon, garlic, ice water blended until very smooth. Homemade is genuinely different from the tub version.
- **Meze assembly:** A Middle Eastern dinner often isn't one dish — it's several small ones. A recipe set might legitimately be a hummus + tabbouleh + kofta + flatbread cluster rather than separate standalone meals.
- **Shakshuka:** Eggs poached in spiced tomato sauce — a complete one-pan meal that counts as dinner in the tradition, not just breakfast.
- **Layered rice (Maqlouba / Persian rice):** Rice cooked with a crust (tahdig in Persian tradition), spiced and layered with vegetables or meat, flipped out of the pot. Technique worth teaching — requires attention but not skill.

### Example Dishes (Easy → Ambitious)
1. Shakshuka (spiced tomato and egg skillet)
2. Hummus from scratch with warm pita
3. Tabbouleh (bulgur, parsley, tomato, lemon — proportions matter, herb-heavy not grain-heavy)
4. Chicken shawarma (yogurt-spice marinade, oven or pan-roasted)
5. Mujaddara (lentils and caramelized onion over rice) — pantry dish, deeply savory
6. Lamb kofta (spiced ground lamb skewers, grilled or pan-seared)
7. Roasted eggplant with tahini (baba ghanoush base) — can serve as dip or side
8. Lamb and chickpea stew with cinnamon and apricots

### System Prompt Module — Middle Eastern

```
Cuisine principles — Middle Eastern:
- Olive oil is the primary fat; use it generously for roasting, sautéing, and finishing.
- Spice profile: cumin, coriander, allspice, cinnamon (in savory dishes), paprika, sumac, za'atar, and turmeric. Cinnamon in savory applications is correct and important — do not omit it.
- Lemon juice and zest are used constantly — they are finishing acids as important as salt. Every dish gets a squeeze at the end.
- Tahini appears in sauces, dressings, marinades, and as a dip base — include at least one tahini-forward dish per week.
- Chickpeas and lentils are full proteins in this tradition, not sides — mujaddara, falafel, and ful medames are main dishes.
- Include at least one meze-style spread (hummus, baba ghanoush, or a dip cluster) across the week.
- Herbs are not garnish — flat-leaf parsley and fresh mint are structural ingredients used in large quantities.
- [DEFER to diet module for protein restrictions. Vegan: omit yogurt and labneh, use tahini sauces instead; shakshuka works vegan without eggs (add extra chickpeas). Gluten-free: serve with rice or gluten-free flatbread instead of pita.]

Strict variety rules:
- Do not repeat the same core protein or legume more than twice in one week (e.g., chickpeas in both Tuesday hummus and Thursday stew is fine; chickpeas in four dishes is not).
- Vary cooking method: include at least one grilled or roasted dish, one simmered or stewed dish, and one raw or room-temperature preparation (salad, dip, meze) across the week.
```

---

## 4. Latin American (Mexican / Central American / South American)

Covering the full arc here — Mexican home cooking has the deepest pantry penetration in North America (good for users who already own half these ingredients), and South American (Peruvian, Colombian, Argentine) adds range for premium differentiation.

### Signature Spices & Aromatics
Cumin (ground — heavy presence), dried oregano (Mexican oregano is different from Italian; use if available), ancho chile powder, chipotle in adobo, smoked paprika, coriander (ground), epazote (dried or fresh — Mexican herb, hard to sub but distinct). Aromatics: garlic, white onion, jalapeño or serrano (fresh), cilantro (fresh, used heavily as finish), lime (juice, always). Dried chiles: ancho, guajillo, pasilla, arbol — toasted and rehydrated for complex sauces.

### Pantry Staples
- **Grains/legumes:** Long-grain white rice, dried or canned black beans, dried or canned pinto beans, masa harina (for tortillas and tamales), corn tortillas, dried hominy (for pozole)
- **Canned:** Canned diced tomatoes, canned chiles in adobo, canned tomatillos (for green salsa)
- **Oils:** Neutral oil for cooking, lard where traditional (optional)
- **Dairy:** Crema (Mexican sour cream — thinner than American), cotija cheese (salty, crumbly — like a Mexican parmesan), queso fresco, Oaxacan cheese (stringy, melts well)
- **Other:** Lime (structural, not optional), dried chiles (ancho and guajillo are the baseline buy), pepitas (pumpkin seeds — sauce and garnish), avocado (for guacamole and finish)

### Typical Proteins
Chicken (whole legs, thighs — braises and adobos), pork (shoulder for carnitas, ground for taco filling), beef (chuck for birria, ground for picadillo), shrimp (coastal Mexican), fish (white fish tacos, ceviche).
**Vegetarian/vegan swaps:** Black beans, pinto beans, corn, squash, mushrooms (portobello and oyster absorb chile sauces well), jackfruit (not traditional but works structurally in carnitas-style applications).

### Core Techniques
- **Chile sauce from dried chiles:** Toast dried chiles in a dry skillet (30 seconds per side, until fragrant), soak in boiling water 20 minutes, blend with soaking liquid, garlic, and aromatics. This is the base of mole, enchilada sauce, birria, pozole. Worth teaching step-by-step.
- **Sofrito / recado base:** Sauté onion, garlic, tomato (and dried chiles in Mexican tradition) until soft and slightly caramelized. Spanish influence, appears in Caribbean and South American cooking as sofrito.
- **Slow braise / carnitas:** Pork cooked low and slow in its own fat with aromatics — finish by crisping in the same pan. Low effort, high reward, yields lots of meals.
- **Dry-toast masa:** For tortillas and tamales — masa harina worked with warm water and lard or oil. Homemade corn tortillas are 15 minutes and genuinely better.
- **Ceviche technique (Peruvian / coastal):** Raw seafood "cooked" in lime juice acid over 15–30 minutes, tossed with onion, chile, and cilantro. No heat. Requires fresh fish — flag this in the recipe.
- **Mole shortcuts:** Full mole negro takes hours and 30 ingredients. A weeknight-friendly mole uses ancho, chipotle, tomatoes, chocolate, and cumin — 45 minutes. Worth a recipe that doesn't lie about what it is.

### Example Dishes (Easy → Ambitious)
1. Black bean tacos with avocado and cotija (pantry dinner)
2. Salsa verde chicken (tomatillo and chile, oven or slow cooker)
3. Arroz con pollo (rice and chicken, one-pot)
4. Carne asada (marinated flank steak, seared or grilled)
5. Carnitas (slow-braised pork shoulder, pan-crisped)
6. Peruvian lomo saltado (stir-fried beef with fries and soy sauce — yes, soy sauce; Chinese influence in Peru is real and documented)
7. Birria (beef or goat braise in dried chile sauce, served as stew or taco filling)
8. Weeknight mole (ancho-chipotle-chocolate sauce over chicken thighs)

### System Prompt Module — Latin American

```
Cuisine principles — Latin American (Mexican / Peruvian / South American):
- Cumin, dried oregano, and dried chiles (ancho, guajillo, chipotle) are the flavor backbone. Smoked paprika and coriander support.
- Dried chile sauces are central, not optional: toast, soak, and blend dried chiles to build the base of braises, enchilada sauces, and stews. Instruct users on the technique; it is not difficult.
- Lime juice is structural — finish every dish with a fresh squeeze, and use it in marinades. Not a garnish.
- Black beans and pinto beans are full proteins in this tradition and should appear at least twice across the week.
- Fresh cilantro is a finishing herb used in quantity; it is not optional in Mexican tradition (flag for users who dislike it so they can substitute flat-leaf parsley).
- Corn is a grain here: corn tortillas, masa, and hominy are distinct pantry items with different roles. Flour tortillas are acceptable for speed.
- Include a balance of sauced/braised dishes (mole, salsa verde chicken, birria) and dry or fresh preparations (tacos with raw toppings, ceviche, grilled meats).
- [DEFER to diet module for protein restrictions. Vegan: black beans, pinto beans, and squash are sufficient protein pillars; omit cheese and crema. Keto: reduce rice and beans, serve braises over cauliflower rice or with avocado.]

Strict variety rules:
- Do not repeat the same chile base more than twice in one week (e.g., two chipotle dishes is acceptable; three is not — rotate to ancho, guajillo, or tomatillo-based preparations).
- Vary the regional tradition: do not make only taco-format dishes. Rotate between tacos/wraps, rice bowls, braises, and raw preparations (salads, ceviche, guacamole) across the week.
```

---

## 5. Classic Home-Style (American comfort / heartland)

Comfort cooking — meatloaf, fried chicken, casseroles, pot roast, mac and cheese, chicken pot pie. The smallest specialty-pantry footprint of any cuisine here: most households already own everything, which makes it the easiest cuisine to cook straight off a typical grocery receipt. It leans rich and salt-forward by design — see the compatibility note at the end of this section and the matrix that follows.

### Signature Seasonings & Aromatics
Salt and black pepper (heavily — flag for Low-Salt), garlic powder, onion powder, paprika (sweet and smoked), dried thyme, sage, dried parsley, bay leaf, poultry seasoning, butter, Worcestershire sauce, yellow mustard, a little brown sugar (glazes, meatloaf), ketchup or tomato paste. Aromatics: yellow onion, celery, carrot (the mirepoix trio), garlic. Stock (chicken or beef) is the everyday liquid.

### Pantry Staples
- **Grains/starch:** Russet potatoes (mashed, roasted, in casseroles), egg noodles, elbow macaroni, white rice, all-purpose flour (gravy/roux/dredging), breadcrumbs, sandwich bread, pasta
- **Dairy/fats:** Butter, whole milk, heavy cream, sour cream, sharp cheddar, American cheese (for mac), eggs
- **Canned/frozen:** Canned cream-of-mushroom (or a scratch roux), canned green beans, frozen peas and corn, canned diced tomatoes
- **Condiments:** Ketchup, yellow mustard, Worcestershire, brown sugar, bbq sauce
- **Proteins on hand:** Ground beef, chicken (legs/thighs and breasts), pork chops, bacon, breakfast sausage, beef chuck (pot roast)

### Typical Proteins
Ground beef (meatloaf, casseroles, sloppy joes, chili), chicken (fried, baked, pot pie), pork chops, bacon and sausage, beef chuck (pot roast, stew), eggs.
**Vegetarian swaps:** Eggs and cheese carry this cuisine — baked mac and cheese, egg-noodle and vegetable casseroles, lentil or mushroom "meat"loaf, bean chili.
**Vegan swaps:** Possible but a real stretch — lentil/mushroom loaf, vegan mac, bean-and-veg casseroles, mashed potatoes with plant milk + oil. The flavor identity weakens; see the compatibility note.

### Core Techniques
- **Roux & pan gravy:** Equal butter and flour cooked to a blond paste, whisked with stock and pan drippings into gravy — the backbone of comfort plates (meatloaf, pot roast, mashed potatoes).
- **Braise / pot roast:** Sear a chuck roast, then low oven with mirepoix and stock for hours until fork-tender. Low effort, big payoff, yields leftovers.
- **Casserole assembly:** Layer a starch + protein + vegetable + binder (cream sauce or cheese) and bake — the defining home-style format.
- **Dredge-and-fry / oven-fry:** Seasoned flour (or flour-egg-crumb) coating for fried chicken or pork; oven-fry on a rack for a lighter version.
- **Mash & bake:** Boil-and-mash potatoes with butter and milk; bake meatloaf and casseroles low and even.

### Example Dishes (Easy → Ambitious)
1. Sloppy joes (ground beef, fast weeknight)
2. Baked mac and cheese
3. Oven-"fried" chicken with mashed potatoes
4. Tuna or chicken noodle casserole
5. Meatloaf with brown-sugar glaze and gravy
6. Pot roast with carrots and potatoes (Sunday braise)
7. Chicken pot pie (scratch crust or biscuit top)
8. Shepherd's / cottage pie (ground beef + mashed-potato lid)

### System Prompt Module — Classic Home-Style

```
Cuisine principles — Classic Home-Style (American comfort):
- Build plates around a protein + a starch (potatoes, noodles, rice) + a simple vegetable, in the familiar American comfort idiom.
- Pan gravy and cream/cheese (roux-based) sauces are core — include at least one gravy- or cream-sauce dish in the week.
- Seasoning is straightforward: salt, black pepper, garlic and onion powder, paprika, dried thyme/sage, Worcestershire. Do not reach for exotic spices — this cuisine's identity is familiar, savory, and unfussy.
- Casseroles and braises (pot roast, baked pasta, sheet-pan bakes) are signature formats; include at least one one-dish bake or braise per week.
- Lean on what a typical household already has — this should feel like "what's in the fridge," not a special shopping trip.
- [DEFER to diet module. Vegetarian: eggs, cheese, beans, lentil/mushroom loaf, baked mac. Vegan: possible but identity weakens (note to user). NOT offered for Keto, Low-Salt, or Diabetic — see compatibility matrix.]

Strict variety rules:
- Do not repeat the same protein format more than twice (e.g., not three ground-beef dishes) — rotate beef, chicken, pork, and a meatless bake.
- Vary the format: at least one braise, one casserole/bake, and one quick skillet or sandwich-style dinner — don't make seven heavy oven dishes.
```

### Compatibility note
Classic Home-Style is rich and salt-forward by nature. Offered for **Mediterranean (loosely), Vegetarian, and — with a caveat — Vegan**, and **NOT offered when Keto, Low-Salt, or Diabetic is active**: there's no honest "low-sodium fried-chicken casserole," and forcing it produces sad food. This is the clearest case of the compatibility rule below.

---

## Cuisine × Diet / Modifier Compatibility

Product rule: **if a cuisine can't honestly conform to a restriction, don't offer it for that restriction** — filter it out of the cuisine list when the modifier is active. Legend: ✓ offered · ~ offered with constraints · ✗ hidden.

| Cuisine | Mediterranean | Keto | Paleo | Vegetarian | Vegan | +Gluten-Free | +Low-Salt | +Diabetic |
|---|---|---|---|---|---|---|---|---|
| Indian / South Asian | ✓ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ |
| East Asian | ✓ | ~ | ✗ | ✓ | ✓ | ~ | ✗ | ~ |
| Middle Eastern | ✓ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Latin American | ✓ | ~ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Classic Home-Style | ~ | ✗ | ✗ | ✓ | ~ | ~ | ✗ | ✗ |

Notes:
- **East Asian + Low-Salt = ✗**: soy/fish/oyster sauces are the backbone and are sodium bombs; stripping them removes the identity. East Asian + Paleo = ✗ (grains/soy/rice central); + Diabetic = ~ (cauliflower rice, limit sweet sauces).
- **Paleo ~** for Indian/Middle Eastern/Latin: drop grains/legumes/dairy — doable but narrows the menu.
- **Keto ~** across the board: reduce rice/bread/legumes, serve over cauliflower rice.
- This matrix is the single source of truth for which cuisine chips to show once a diet + modifiers are selected.

---

## Engineering Notes

1. **Module stacking order:** Cuisine module should come *after* the diet module in the system prompt so diet rules are established first. The cuisine module then applies within those constraints.

2. **Ingredient availability flags:** Indian, East Asian, and Middle Eastern cuisine modules assume access to specialty pantry items (gochujang, tahini, dried chiles). Consider a user-facing "pantry check" at cuisine selection that lists the 3–4 must-have specialty items. Nothing worse than a recipe requiring doubanjiang when the user lives 45 minutes from an Asian grocery. (Classic Home-Style is the opposite — no specialty items, the safe default.)

3. **Fish sauce and oyster sauce (East Asian):** Flag for vegan diet — the module says to defer, but make sure the diet module's vegan rules explicitly override any cuisine ingredient suggestions. Easy to miss in a long prompt.

4. **Classic Home-Style:** The opposite extreme — essentially zero specialty ingredients, so it's the best default / "first cuisine" for users who haven't stocked an ethnic pantry. Its constraint is dietary, not availability: gate it off Keto, Low-Salt, and Diabetic per the compatibility matrix rather than letting it generate non-compliant comfort food.

5. **Variety rules interaction:** If a user picks both a diet module (e.g., Vegetarian) and a cuisine module (e.g., Indian), the "strict variety rules" from BOTH modules apply. Test this combination explicitly — the rules should complement, not conflict. Indian Vegetarian is actually the easiest combination because the cuisine is already predominantly vegetarian and the variety rules don't pull against each other.

6. **Portioning and batch logic:** Several of these cuisines (jollof rice, dal makhani, carnitas) are naturally batch-cook dishes that yield enough for multiple meals. The AI should either plan these as deliberate leftovers OR limit them to one per week. Worth a short note in the module or a shared "batch cook" rule.
