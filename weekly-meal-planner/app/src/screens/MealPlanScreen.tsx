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
import { RootStackParamList, Recipe } from '../types';
import RecipeCard from '../components/RecipeCard';
import { saveMenu } from '../services/savedMenusService';
import { regenerateRecipe } from '../services/claudeService';
import { fetchFoodPhoto } from '../services/unsplashService';
import { saveCurrentMealPlan } from '../services/currentMealPlanService';

type Props = NativeStackScreenProps<RootStackParamList, 'MealPlan'>;

export default function MealPlanScreen({ navigation, route }: Props) {
  const { ingredients, pantrySavedCount } = route.params;
  const [recipes, setRecipes] = useState<Recipe[]>(route.params.recipes);
  const [saving, setSaving] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);
  const [refreshingDay, setRefreshingDay] = useState<string | null>(null);

  async function handleRefreshRecipe(index: number) {
    const dayToReplace = recipes[index].day;
    setRefreshingDay(dayToReplace);
    try {
      const newRecipe = await regenerateRecipe(ingredients, recipes, dayToReplace);
      const photoUrl = (await fetchFoodPhoto(newRecipe.searchQuery)) ?? undefined;
      const updated = recipes.map((r, i) =>
        i === index ? { ...newRecipe, photoUrl } : r
      );
      setRecipes(updated);
      setMenuSaved(false);
      await saveCurrentMealPlan(updated, ingredients);
    } catch (e: any) {
      Alert.alert('Could not refresh recipe', e.message);
    } finally {
      setRefreshingDay(null);
    }
  }

  async function handleSaveMenu() {
    setSaving(true);
    try {
      await saveMenu(recipes, ingredients);
      setMenuSaved(true);
      Alert.alert('Menu Saved!', 'This meal plan has been saved to your Menus folder.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
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
              7 recipes built from {ingredients.length} ingredients.
              Tap any recipe for the full card.
            </Text>
            {pantrySavedCount != null && pantrySavedCount > 0 && (
              <View style={styles.pantryBanner}>
                <Text style={styles.pantryBannerText}>
                  🧺  {pantrySavedCount} item{pantrySavedCount !== 1 ? 's' : ''} saved to your pantry
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.saveMenuBtn, menuSaved && styles.saveMenuBtnSaved]}
              onPress={handleSaveMenu}
              disabled={saving || menuSaved}
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
            onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
            onRefresh={() => handleRefreshRecipe(index)}
            refreshing={refreshingDay === item.day}
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
  pantryBanner: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#a8dadc',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  pantryBannerText: { fontSize: 13, color: '#1d5c63', fontWeight: '600' },
});
