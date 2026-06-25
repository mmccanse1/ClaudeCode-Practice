import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Share, Platform } from 'react-native';
import { Recipe, DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';

function buildRecipeCardHtml(recipe: Recipe, dietType: DietType = 'mediterranean'): string {
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const photoHtml = recipe.photoUrl
    ? `<img src="${recipe.photoUrl}" alt="${recipe.name}" class="hero-photo" />`
    : `<div class="hero-placeholder"><span>🫒</span></div>`;

  const ingredientsHtml = recipe.ingredients
    .map(i => `<li>${i}</li>`)
    .join('\n');

  const stepsHtml = recipe.steps
    .map((s, idx) => `<li><span class="step-num">${idx + 1}</span>${s}</li>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${recipe.name} — ${dietConfig.label} Recipe Card</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #f5f0e8;
      color: #2c2c2c;
      max-width: 780px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }
    .day-badge {
      display: inline-block;
      background: #2e86ab;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .diet-badge {
      display: inline-block;
      background: #a8dadc;
      color: #1d5c63;
      font-family: Arial, sans-serif;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      margin-left: 8px;
    }
    h1 {
      font-size: 2rem;
      line-height: 1.2;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .description {
      font-size: 1.05rem;
      color: #555;
      margin-bottom: 20px;
      font-style: italic;
    }
    .hero-photo {
      width: 100%;
      height: 320px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .hero-placeholder {
      width: 100%;
      height: 320px;
      border-radius: 12px;
      background: linear-gradient(135deg, #a8dadc, #2e86ab);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 80px;
      margin-bottom: 24px;
    }
    .meta-row {
      display: flex;
      gap: 20px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: white;
      border-radius: 10px;
      padding: 10px 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      min-width: 90px;
    }
    .meta-label {
      font-family: Arial, sans-serif;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      margin-bottom: 4px;
    }
    .meta-value {
      font-family: Arial, sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #2e86ab;
    }
    .section-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: #1a1a1a;
      border-bottom: 2px solid #a8dadc;
      padding-bottom: 6px;
      margin-bottom: 16px;
    }
    .ingredients-list {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 8px;
      margin-bottom: 32px;
    }
    .ingredients-list li {
      background: white;
      border-left: 4px solid #f4a261;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
      font-size: 0.95rem;
    }
    .steps-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 32px;
    }
    .steps-list li {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      background: white;
      border-radius: 10px;
      padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      font-size: 0.97rem;
      line-height: 1.5;
    }
    .step-num {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      background: #2e86ab;
      color: white;
      font-family: Arial, sans-serif;
      font-weight: 700;
      font-size: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nutrition-note {
      background: linear-gradient(135deg, #e8f5e9, #a8dadc20);
      border: 1px solid #a8dadc;
      border-radius: 10px;
      padding: 14px 18px;
      font-size: 0.92rem;
      color: #1d5c63;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div class="day-badge">${recipe.day}</div>
  <span class="diet-badge">${dietConfig.emoji} ${dietConfig.label} Diet</span>
  <h1>${recipe.name}</h1>
  <p class="description">${recipe.description}</p>

  ${photoHtml}

  <div class="meta-row">
    <div class="meta-item">
      <span class="meta-label">Prep Time</span>
      <span class="meta-value">${recipe.prepTime}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Cook Time</span>
      <span class="meta-value">${recipe.cookTime}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Servings</span>
      <span class="meta-value">${recipe.servings}</span>
    </div>
  </div>

  <h2 class="section-title">Ingredients</h2>
  <ul class="ingredients-list">
    ${ingredientsHtml}
  </ul>

  <h2 class="section-title">Instructions</h2>
  <ol class="steps-list">
    ${stepsHtml}
  </ol>

  <div class="nutrition-note">
    <span>🌿</span>
    <span>${recipe.nutritionNotes}</span>
  </div>

  <div class="footer">
    Generated by Weekly Meal Planner · ${dietType === 'mediterranean' ? 'Mediterranean diet guidelines via Mayo Clinic' : `${dietConfig.label} diet guidelines`}
  </div>
</body>
</html>`;
}

export async function saveAndShareRecipeCard(recipe: Recipe, dietType: DietType = 'mediterranean'): Promise<string> {
  const html = buildRecipeCardHtml(recipe, dietType);
  const filename = `${recipe.day}_${recipe.name.replace(/\s+/g, '_').toLowerCase()}.html`;
  const path = `${FileSystem.documentDirectory}meal_plans/${filename}`;

  await FileSystem.makeDirectoryAsync(
    `${FileSystem.documentDirectory}meal_plans/`,
    { intermediates: true }
  );
  await FileSystem.writeAsStringAsync(path, html, {
    encoding: 'utf8' as any,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/html',
      dialogTitle: `${recipe.name} Recipe`,
    });
  }

  return path;
}

export function buildRecipeCardHtmlString(recipe: Recipe, dietType: DietType = 'mediterranean'): string {
  return buildRecipeCardHtml(recipe, dietType);
}

function buildShareableText(recipe: Recipe, dietType: DietType = 'mediterranean'): string {
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const ingredients = recipe.ingredients.map(i => `• ${i}`).join('\n');
  const steps = recipe.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');

  return [
    `🍽️ ${recipe.name}`,
    `${dietConfig.emoji} ${dietConfig.label} Diet  •  ${recipe.day}`,
    '',
    recipe.description,
    '',
    `⏱ Prep: ${recipe.prepTime}  •  Cook: ${recipe.cookTime}  •  Serves: ${recipe.servings}`,
    '',
    '📋 Ingredients:',
    ingredients,
    '',
    '👨‍🍳 Instructions:',
    steps,
    '',
    `🌿 ${recipe.nutritionNotes}`,
    '',
    '📱 Created with Weekly Meal Planner',
  ].join('\n');
}

export async function shareRecipePng(pngUri: string, recipeName: string): Promise<void> {
  if (Platform.OS === 'ios') {
    await Share.share({ url: pngUri, message: '' });
  } else {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(pngUri, {
        mimeType: 'image/jpeg',
        dialogTitle: `${recipeName} Recipe Card`,
      });
    }
  }
}

export async function shareRecipeNative(recipe: Recipe, dietType: DietType = 'mediterranean'): Promise<void> {
  const message = buildShareableText(recipe, dietType);

  if (recipe.photoUrl) {
    try {
      const localUri = `${FileSystem.cacheDirectory}recipe_share_${Date.now()}.jpg`;
      const dl = await FileSystem.downloadAsync(recipe.photoUrl, localUri);

      if (dl.status === 200) {
        if (Platform.OS === 'ios') {
          // iOS: native share sheet sends both the image file and the text body
          await Share.share({ message, url: localUri });
        } else {
          // Android: share the image via the native sheet (text not bundled, but image is primary)
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(localUri, {
              mimeType: 'image/jpeg',
              dialogTitle: recipe.name,
            });
          } else {
            await Share.share({ message, title: recipe.name });
          }
        }
        return;
      }
    } catch {
      // photo download failed — fall through to text-only share
    }
  }

  await Share.share({ message, title: `${recipe.name} Recipe` });
}
