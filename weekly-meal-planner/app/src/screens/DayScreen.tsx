import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe, DietType, MealType } from '../types';
import { mealMeta, sortByMeal } from '../constants/mealTypes';
import RecipeCard from '../components/RecipeCard';
import { regenerateRecipe, RATE_LIMIT_ERROR, AI_PARSE_ERROR } from '../services/claudeService';
import { fetchFoodPhoto } from '../services/unsplashService';
import { saveCurrentMealPlan } from '../services/currentMealPlanService';

type Props = NativeStackScreenProps<RootStackParamList, 'Day'>;

// Stable identity for a recipe within a week = its day + meal type.
function recipeKey(r: Recipe): string {
  return `${r.day}-${r.mealType ?? 'dinner'}`;
}

export default function DayScreen({ navigation, route }: Props) {
  const { day, ingredients } = route.params;
  const dietType: DietType = route.params.dietType;
  const glutenFree = route.params.glutenFree ?? false;
  const lowSalt = route.params.lowSalt ?? false;
  const diabetic = route.params.diabetic ?? false;
  const isSavedView = route.params.saved ?? false;

  // Hold the full week so a refresh can persist the whole updated plan.
  const [recipes, setRecipes] = useState<Recipe[]>(route.params.recipes);
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const isRefreshing = useRef(false);

  const dayMeals = sortByMeal(recipes.filter(r => r.day === day));

  async function handleRefresh(target: Recipe) {
    if (isRefreshing.current || isSavedView) return;
    isRefreshing.current = true;
    const mealType: MealType = target.mealType ?? 'dinner';
    setRefreshingKey(recipeKey(target));
    try {
      const newRecipe = await regenerateRecipe(ingredients, recipes, day, dietType, glutenFree, mealType, lowSalt, diabetic);
      const photoUrl = (await fetchFoodPhoto(newRecipe.searchQuery)) ?? undefined;
      const replacement = { ...newRecipe, photoUrl, dietType, mealType };
      const updated = recipes.map(r =>
        r.day === day && (r.mealType ?? 'dinner') === mealType ? replacement : r
      );
      setRecipes(updated);
      // Active plans persist the swap so the overview + Save Menu stay in sync.
      if (!isSavedView) await saveCurrentMealPlan(updated, ingredients, dietType);
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    } catch (e: any) {
      if (e.message === RATE_LIMIT_ERROR) {
        Alert.alert('The kitchen’s backed up', 'Too many cooks right now. Give it a minute, then tap refresh to try again.');
      } else if (e.message === AI_PARSE_ERROR) {
        Alert.alert('Let’s try that again', 'Something came back garbled — this recipe is unchanged. Tap refresh to give it another go.');
      } else if (e.message.startsWith('No internet') || e.message.startsWith('Request timed out')) {
        Alert.alert('Can’t reach the kitchen', e.message);
      } else {
        Alert.alert('Couldn’t refresh that recipe', 'We hit a snag — this recipe is unchanged. Tap refresh to try again.');
      }
    } finally {
      isRefreshing.current = false;
      setRefreshingKey(null);
    }
  }

  return (
    <View style={styles.root}>
      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>✓  Recipe updated &amp; saved</Text>
        </View>
      )}
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{day}</Text>
          <Text style={styles.subtitle}>
            {dayMeals.length} recipe{dayMeals.length !== 1 ? 's' : ''} for {day}. Tap any card for the full recipe.
          </Text>

          {dayMeals.map(recipe => {
            const meta = mealMeta(recipe.mealType);
            const key = recipeKey(recipe);
            return (
              <View key={key}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealHeaderText}>{meta.emoji}  {meta.label}</Text>
                </View>
                <RecipeCard
                  recipe={recipe}
                  onPress={() => navigation.navigate('RecipeDetail', { recipe, dietType })}
                  onRefresh={isSavedView ? undefined : () => handleRefresh(recipe)}
                  refreshing={refreshingKey === key}
                  refreshDisabled={refreshingKey !== null && refreshingKey !== key}
                />
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#5b7a8c', lineHeight: 20, marginBottom: 16 },

  mealHeader: { marginBottom: 8, marginTop: 4 },
  mealHeaderText: { fontSize: 15, fontWeight: '800', color: '#1d5c63', letterSpacing: 0.3 },

  toast: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: '#1d5c63',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    zIndex: 99,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  toastText: { color: 'white', fontSize: 14, fontWeight: '700' },
});
