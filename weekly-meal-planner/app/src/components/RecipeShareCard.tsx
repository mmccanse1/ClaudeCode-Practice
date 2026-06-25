import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Recipe, DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';

const CARD_W = Dimensions.get('window').width;

interface Props {
  recipe: Recipe;
  dietType: DietType;
}

export default function RecipeShareCard({ recipe, dietType }: Props) {
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];

  return (
    <View style={[styles.card, { width: CARD_W }]}>
      {/* Hero photo */}
      {recipe.photoUrl ? (
        <Image source={{ uri: recipe.photoUrl }} style={styles.hero} />
      ) : (
        <View style={styles.heroPlaceholder}>
          <Text style={styles.heroEmoji}>🫒</Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayText}>{recipe.day}</Text>
          </View>
          <View style={styles.dietBadge}>
            <Text style={styles.dietText}>
              {dietConfig.emoji} {dietConfig.label}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.name}>{recipe.name}</Text>
        <Text style={styles.description}>{recipe.description}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>PREP</Text>
            <Text style={styles.metaValue}>{recipe.prepTime}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>COOK</Text>
            <Text style={styles.metaValue}>{recipe.cookTime}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>SERVES</Text>
            <Text style={styles.metaValue}>{recipe.servings}</Text>
          </View>
        </View>

        {/* Ingredients */}
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {recipe.ingredients.map((ing, i) => (
          <View key={i} style={styles.ingredientRow}>
            <View style={styles.dot} />
            <Text style={styles.ingredientText}>{ing}</Text>
          </View>
        ))}

        {/* Steps */}
        <Text style={styles.sectionTitle}>Instructions</Text>
        {recipe.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}

        {/* Nutrition */}
        <View style={styles.nutritionBox}>
          <Text style={styles.nutritionIcon}>🌿</Text>
          <Text style={styles.nutritionText}>{recipe.nutritionNotes}</Text>
        </View>

        {/* Branding footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Weekly Meal Planner</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#f5f0e8' },
  hero: { width: '100%', height: 260, resizeMode: 'cover' },
  heroPlaceholder: {
    width: '100%',
    height: 260,
    backgroundColor: '#a8dadc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 72 },
  body: { padding: 20 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dayBadge: {
    backgroundColor: '#2e86ab',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  dayText: { color: 'white', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  dietBadge: {
    backgroundColor: '#e8f8f9',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dietText: { color: '#1d5c63', fontSize: 12, fontWeight: '600' },
  name: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  description: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 9, color: '#aaa', fontWeight: '700', letterSpacing: 0.8, marginBottom: 3 },
  metaValue: { fontSize: 14, fontWeight: '700', color: '#2e86ab' },
  metaDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#a8dadc',
    paddingBottom: 5,
    marginBottom: 10,
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
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f4a261',
    marginRight: 8,
  },
  ingredientText: { fontSize: 13, color: '#333', flex: 1 },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2e86ab',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: { color: 'white', fontWeight: '700', fontSize: 12 },
  stepText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 20 },
  nutritionBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#a8dadc',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  nutritionIcon: { fontSize: 16 },
  nutritionText: { flex: 1, fontSize: 12, color: '#1d5c63', lineHeight: 18 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e0ddd6',
    paddingTop: 12,
    alignItems: 'center',
  },
  footerText: { fontSize: 11, color: '#aaa', fontWeight: '600', letterSpacing: 0.5 },
});
