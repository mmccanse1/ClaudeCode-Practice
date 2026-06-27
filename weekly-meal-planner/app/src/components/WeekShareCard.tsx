import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Recipe, DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';
import { sortByMeal, mealMeta } from '../constants/mealTypes';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Fixed-size vertical (9:16-ish) card meant to be rendered off-screen and
// captured to a PNG with react-native-view-shot, then shared to social. It is
// text-forward on purpose: no remote <Image>s, so capture never races image
// loads. Branding + the "cook what you already bought" hook + a Google Play CTA
// are baked in so a shared image actually drives installs.
const CARD_W = 360;

interface Props {
  recipes: Recipe[];
  dietType: DietType;
  /** How many pantry/receipt ingredients this week was built from (for the stat line). */
  ingredientCount?: number;
}

export default function WeekShareCard({ recipes, dietType, ingredientCount }: Props) {
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const accent = dietConfig.color;

  const mealTypeCount = new Set(recipes.map(r => r.mealType ?? 'dinner')).size;
  const isSingleMeal = mealTypeCount <= 1;

  const daysWithMeals = DAY_ORDER
    .map(day => ({ day, meals: sortByMeal(recipes.filter(r => r.day === day)) }))
    .filter(d => d.meals.length > 0);

  return (
    <View style={[styles.card, { width: CARD_W }]}>
      {/* Brand header */}
      <View style={[styles.brandBar, { backgroundColor: accent }]}>
        <Text style={styles.brandName}>Weekly Meal Planner</Text>
        <Text style={styles.brandTag}>Cook what you already bought</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.dietLabel, { color: accent }]}>{dietConfig.label} week</Text>
        <Text style={styles.title}>My menu for the week</Text>

        {/* Day-by-day list */}
        <View style={styles.list}>
          {daysWithMeals.map(({ day, meals }) => (
            <View key={day} style={styles.dayRow}>
              <Text style={[styles.dayLabel, { color: accent }]}>{day.slice(0, 3).toUpperCase()}</Text>
              <View style={styles.dayMeals}>
                {meals.map(m => (
                  <Text
                    key={`${m.day}-${m.mealType ?? 'dinner'}`}
                    style={styles.mealLine}
                    numberOfLines={1}
                  >
                    {isSingleMeal ? '' : `${mealMeta(m.mealType).label}: `}
                    {m.name}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Honest, no-fake-$ stat */}
        <View style={[styles.statPill, { borderColor: accent }]}>
          <Text style={[styles.statText, { color: accent }]}>
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
            {ingredientCount ? ` from ${ingredientCount} ingredients I already had` : ' from food I already had'} · $0 extra shopping
          </Text>
        </View>
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
  card: {
    backgroundColor: '#f5f0e8',
    borderRadius: 0,
    overflow: 'hidden',
  },
  brandBar: {
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 22,
  },
  brandName: { color: 'white', fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  brandTag: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  body: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },
  dietLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 18 },
  list: { gap: 12 },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dayLabel: { width: 38, fontSize: 13, fontWeight: '800', paddingTop: 1 },
  dayMeals: { flex: 1, gap: 2 },
  mealLine: { fontSize: 14, color: '#2c2c2c', fontWeight: '500', lineHeight: 19 },
  statPill: {
    marginTop: 20,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'white',
  },
  statText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  footer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 22,
    marginTop: 10,
  },
  footerLine: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  footerCta: { fontSize: 14, fontWeight: '800', marginTop: 3 },
});
