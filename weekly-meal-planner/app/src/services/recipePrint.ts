import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { Recipe } from '../types';

// Escape anything that lands in the print HTML — recipe text is model-generated,
// so treat it as untrusted and never let it break the markup.
function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The print renderer can load remote (http/https) images directly, but local
// cache files (file://…) must be inlined as base64 or they silently drop out.
async function heroImageTag(photoUrl?: string): Promise<string> {
  if (!photoUrl) return '';
  try {
    if (/^https?:/i.test(photoUrl)) {
      return `<img class="hero" src="${esc(photoUrl)}" />`;
    }
    const b64 = await FileSystem.readAsStringAsync(photoUrl, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `<img class="hero" src="data:image/png;base64,${b64}" />`;
  } catch {
    return '';
  }
}

// Build a print-ready, US-Letter (8.5"×11") HTML document for one recipe.
// Real document layout — point-based type, page margins, flowing text — so it
// prints like a recipe card, not a phone screenshot.
export async function buildRecipePrintHtml(recipe: Recipe, dietLabel: string): Promise<string> {
  const hero = await heroImageTag(recipe.photoUrl);
  const ingredients = recipe.ingredients.map(i => `<li>${esc(i)}</li>`).join('');
  const steps = recipe.steps.map(s => `<li>${esc(s)}</li>`).join('');

  const macros = recipe.nutrition
    ? `<h2>Estimated nutrition · per serving</h2>
       <table class="macros"><tr>
         <td><span class="v">${esc(recipe.nutrition.calories)}</span><br/>CAL</td>
         <td><span class="v">${esc(recipe.nutrition.protein)}g</span><br/>PROTEIN</td>
         <td><span class="v">${esc(recipe.nutrition.carbs)}g</span><br/>CARBS</td>
         <td><span class="v">${esc(recipe.nutrition.fat ?? 0)}g</span><br/>FAT</td>
         <td><span class="v">${esc(recipe.nutrition.sugar)}g</span><br/>SUGAR</td>
         <td><span class="v">${esc(recipe.nutrition.sodium)}mg</span><br/>SODIUM</td>
       </tr></table>
       <p class="disclaimer">Estimated for general guidance — not medical or dietary advice.</p>`
    : '';

  const notes = recipe.nutritionNotes
    ? `<p class="notes">${esc(recipe.nutritionNotes)}</p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: letter; margin: 0.75in; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 12pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 25pt; margin: 0 0 4pt; }
  .meta { color: #5b7a8c; font-size: 10.5pt; margin-bottom: 12pt; }
  .hero { width: 100%; max-height: 3.1in; object-fit: cover; border-radius: 8pt; margin-bottom: 14pt; }
  .desc { font-style: italic; color: #444; margin: 0 0 14pt; }
  h2 { font-size: 14pt; border-bottom: 2pt solid #a8dadc; padding-bottom: 3pt; margin: 18pt 0 8pt; page-break-after: avoid; }
  ul, ol { margin: 0; padding-left: 1.3em; }
  li { margin-bottom: 5pt; page-break-inside: avoid; }
  .macros { width: 100%; border-collapse: collapse; margin-top: 6pt; }
  .macros td { border: 1pt solid #dbe9f0; padding: 7pt 4pt; text-align: center; font-size: 9pt; color: #5b7a8c; letter-spacing: 0.5pt; }
  .macros .v { font-weight: 800; font-size: 13pt; color: #2e86ab; letter-spacing: 0; }
  .notes { background: #eef6f7; border: 1pt solid #a8dadc; border-radius: 6pt; padding: 9pt 11pt; font-size: 10.5pt; color: #1d5c63; }
  .disclaimer { font-size: 9pt; color: #9bb4c2; font-style: italic; margin-top: 6pt; }
  .foot { margin-top: 20pt; padding-top: 8pt; border-top: 1pt solid #dbe9f0; font-size: 9pt; color: #9bb4c2; text-align: center; }
</style>
</head>
<body>
  <h1>${esc(recipe.name)}</h1>
  <div class="meta">${esc(recipe.day)} &middot; ${esc(dietLabel)} &middot; Prep ${esc(recipe.prepTime)} &middot; Cook ${esc(recipe.cookTime)} &middot; Serves ${esc(recipe.servings)}</div>
  ${hero}
  <div class="desc">${esc(recipe.description)}</div>
  <h2>Ingredients</h2>
  <ul>${ingredients}</ul>
  <h2>Instructions</h2>
  <ol>${steps}</ol>
  ${notes}
  ${macros}
  <div class="foot">Weekly Meal Planner</div>
</body>
</html>`;
}

// Build the letter-format HTML and hand it to the OS print dialog.
export async function printRecipe(recipe: Recipe, dietLabel: string): Promise<void> {
  const html = await buildRecipePrintHtml(recipe, dietLabel);
  await Print.printAsync({ html });
}
