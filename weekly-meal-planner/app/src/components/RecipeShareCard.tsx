import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Recipe, DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';

// Fixed-width recipe card rendered off-screen and captured to a PNG with
// react-native-view-shot, then shared. Mirrors RecipeDetailScreen's layout but
// adds a branded "Get it free on Google Play" footer so a shared image drives
// installs. The hero photo is a local file (already shown on the detail screen),
// so it's warm in the image cache by capture time.
const CARD_W = 360;

interface Props {
  recipe: Recipe;
  dietType: DietType;
}

export default function RecipeShareCard({ recipe, dietType }: Props) {
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const accent = dietConfig.color;

  return (
    <View style={[styles.card, { width: CARD_W }]}>
      {recipe.photoUrl ? (
        <Image source={{ uri: recipe.photoUrl }} style={styles.hero} />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: accent }]}>
          <Text style={styles.heroEmoji}>🫒</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <View style={[styles.dayBadge, { backgroundColor: accent }]}>
            <Text style={styles.dayText}>{recipe.day}</Text>
          </View>
          <View style={styles.dietBadge}>
            <Text style={styles.dietText}>{dietConfig.label}</Text>
          </View>
        </View>

        <Text style={styles.name}>{recipe.name}</Text>
        <Text style={styles.description}>{recipe.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>PREP</Text>
            <Text style={[styles.metaValue, { color: accent }]}>{recipe.prepTime}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>COOK</Text>
            <Text style={[styles.metaValue, { color: accent }]}>{recipe.cookTime}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>SERVES</Text>
            <Text style={[styles.metaValue, { color: accent }]}>{recipe.servings}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { borderBottomColor: accent }]}>Ingredients</Text>
        {recipe.ingredients.map((ing, i) => (
          <View key={i} style={styles.ingredientRow}>
            <View style={styles.dot} />
            <Text style={styles.ingredientText}>{ing}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { borderBottomColor: accent }]}>Instructions</Text>
        {recipe.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: accent }]}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}

        {recipe.nutrition && (
          <View style={styles.macrosCard}>
            <Text style={styles.macrosTitle}>Estimated nutrition · per serving</Text>
            <View style={styles.macrosRow}>
              {([
                ['CAL', `${recipe.nutrition.calories}`],
                ['PROTEIN', `${recipe.nutrition.protein}g`],
                ['CARBS', `${recipe.nutrition.carbs}g`],
                ['SUGAR', `${recipe.nutrition.sugar}g`],
                ['SODIUM', `${recipe.nutrition.sodium}mg`],
              ] as const).map(([label, value]) => (
                <View key={label} style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: accent }]}>{value}</Text>
                  <Text style={styles.macroLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.macrosDisclaimer}>
              Estimated for general guidance — not medical or dietary advice.
            </Text>
          </View>
        )}

        <Text style={styles.sourceNote}>{dietConfig.source}</Text>
      </View>

      {/* CTA footer — the install driver */}
      <View style={styles.footer}>
        <Text style={styles.footerLine}>Scan your receipt → get a week of meals</Text>
        <Text style={[styles.footerCta, { color: accent }]}>Get it free · Weekly Meal Planner on Google Play</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#f5f0e8', overflow: 'hidden' },
  hero: { width: '100%', height: 220, resizeMode: 'cover' },
  heroPlaceholder: { width: '100%', height: 220, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 72 },
  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dayBadge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 14 },
  dayText: { color: 'white', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  dietBadge: { backgroundColor: '#e8f8f9', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  dietText: { color: '#1d5c63', fontSize: 12, fontWeight: '600' },
  name: { fontSize: 23, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  description: { fontSize: 14, color: '#666', fontStyle: 'italic', lineHeight: 20, marginBottom: 16 },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 10, color: '#aaa', fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  metaValue: { fontSize: 15, fontWeight: '700' },
  metaDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 6 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    borderBottomWidth: 2,
    paddingBottom: 6,
    marginBottom: 12,
    marginTop: 6,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#f4a261',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f4a261', marginRight: 10 },
  ingredientText: { fontSize: 13, color: '#333', flex: 1 },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: { color: 'white', fontWeight: '700', fontSize: 13 },
  stepText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 20 },
  macrosCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginTop: 18 },
  macrosTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 15, fontWeight: '800' },
  macroLabel: { fontSize: 9, color: '#aaa', fontWeight: '700', letterSpacing: 0.5, marginTop: 3 },
  macrosDisclaimer: { fontSize: 10, color: '#aaa', fontStyle: 'italic', marginTop: 10, textAlign: 'center' },
  sourceNote: { textAlign: 'center', fontSize: 10, color: '#aaa', marginTop: 16, marginBottom: 4 },
  footer: { backgroundColor: '#1a1a1a', paddingVertical: 16, paddingHorizontal: 20 },
  footerLine: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  footerCta: { fontSize: 14, fontWeight: '800', marginTop: 3 },
});
