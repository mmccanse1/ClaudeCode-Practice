import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe, DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';
import RecipeCard from '../components/RecipeCard';
import { saveMenu } from '../services/savedMenusService';
import { regenerateRecipe, RATE_LIMIT_ERROR, AI_PARSE_ERROR } from '../services/claudeService';
import { fetchFoodPhoto } from '../services/unsplashService';
import { saveCurrentMealPlan } from '../services/currentMealPlanService';

type Props = NativeStackScreenProps<RootStackParamList, 'MealPlan'>;

export default function MealPlanScreen({ navigation, route }: Props) {
  const { ingredients } = route.params;
  const dietType: DietType = route.params.dietType ?? 'mediterranean';
  const glutenFree = route.params.glutenFree ?? false;
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const [recipes, setRecipes] = useState<Recipe[]>(route.params.recipes);
  const [saving, setSaving] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);
  const [refreshingDay, setRefreshingDay] = useState<string | null>(null);

  async function handleRefreshRecipe(index: number) {
    const dayToReplace = recipes[index].day;
    setRefreshingDay(dayToReplace);
    try {
      const newRecipe = await regenerateRecipe(ingredients, recipes, dayToReplace, dietType, glutenFree);
      const photoUrl = (await fetchFoodPhoto(newRecipe.searchQuery)) ?? undefined;
      const updated = recipes.map((r, i) =>
        i === index ? { ...newRecipe, photoUrl } : r
      );
      setRecipes(updated);
      setMenuSaved(false);
      await saveCurrentMealPlan(updated, ingredients, dietType);
    } catch (e: any) {
      if (e.message === RATE_LIMIT_ERROR) {
        Alert.alert('Too Many Requests', 'The AI service is busy right now. Please wait a minute and try again.');
      } else if (e.message === AI_PARSE_ERROR) {
        Alert.alert('Unexpected Response', 'The AI returned an unexpected response. Please try refreshing this recipe again.');
      } else if (e.message.startsWith('No internet')) {
        Alert.alert('No Connection', e.message);
      } else {
        Alert.alert('Could not refresh recipe', 'Something went wrong. Please try again.');
      }
    } finally {
      setRefreshingDay(null);
    }
  }

  async function handleSaveMenu() {
    setSaving(true);
    try {
      const saved = await saveMenu(recipes, ingredients, dietType);
      if (saved) {
        setMenuSaved(true);
        Alert.alert('Menu Saved!', 'This meal plan has been saved to your Menus folder.');
      } else {
        setMenuSaved(true);
        Alert.alert('Already Saved', 'This exact meal plan is already in your Menus folder.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not save your menu. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={recipes}
        keyExtractor={item => item.day}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Your Week of Meals</Text>
            <Text style={styles.subtitle}>
              {dietConfig.emoji}  7 {dietConfig.label} recipes built from {ingredients.length} ingredients.
              Tap any recipe for the full card.
            </Text>
            <TouchableOpacity
              style={[styles.saveMenuBtn, menuSaved && styles.saveMenuBtnSaved]}
              onPress={handleSaveMenu}
              disabled={saving || menuSaved || refreshingDay !== null}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveMenuBtnText}>
                  {menuSaved ? '✓  Menu Saved' : '💾  Save This Menu'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => (
          <RecipeCard
            recipe={item}
            onPress={() => navigation.navigate('RecipeDetail', { recipe: item, dietType })}
            onRefresh={() => handleRefreshRecipe(index)}
            refreshing={refreshingDay === item.day}
            dietLabel={dietConfig.label}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  list: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 16 },
  saveMenuBtn: {
    backgroundColor: '#f4a261',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveMenuBtnSaved: { backgroundColor: '#1d5c63' },
  saveMenuBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});
