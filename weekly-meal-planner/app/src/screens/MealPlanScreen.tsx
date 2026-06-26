import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe, DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';
import RecipeCard from '../components/RecipeCard';
import { saveMenu, getSavedMenus } from '../services/savedMenusService';
import { regenerateRecipe, RATE_LIMIT_ERROR, AI_PARSE_ERROR } from '../services/claudeService';
import { fetchFoodPhoto } from '../services/unsplashService';
import { saveCurrentMealPlan } from '../services/currentMealPlanService';
import { IS_PREMIUM } from '../constants/subscription';

type Props = NativeStackScreenProps<RootStackParamList, 'MealPlan'>;

export default function MealPlanScreen({ navigation, route }: Props) {
  const { ingredients, pantrySavedCount } = route.params;
  const dietType: DietType = route.params.dietType ?? 'mediterranean';
  const glutenFree = route.params.glutenFree ?? false;
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const [recipes, setRecipes] = useState<Recipe[]>(route.params.recipes);
  const [saving, setSaving] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);
  const [milestoneMessage, setMilestoneMessage] = useState('');
  const [showUpsell, setShowUpsell] = useState(false);
  const [refreshingDay, setRefreshingDay] = useState<string | null>(null);
  const [refreshToast, setRefreshToast] = useState(false);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const isFromFreshScan = pantrySavedCount != null;

  useEffect(() => {
    if (!isFromFreshScan) return;
    Animated.sequence([
      Animated.timing(celebrationOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(celebrationOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  function getMilestoneMessage(count: number): string {
    if (count === 1) return 'First menu saved! 🎉';
    if (count === 2) return "You're on a roll! 🔥";
    if (count === 3) return 'Three menus planned! 🏆';
    return `${count} menus saved and counting!`;
  }

  async function handleRefreshRecipe(index: number) {
    const dayToReplace = recipes[index].day;
    setRefreshingDay(dayToReplace);
    try {
      const newRecipe = await regenerateRecipe(ingredients, recipes, dayToReplace, dietType, glutenFree);
      const photoUrl = (await fetchFoodPhoto(newRecipe.searchQuery)) ?? undefined;
      const updated = recipes.map((r, i) =>
        i === index ? { ...newRecipe, photoUrl, dietType } : r
      );
      setRecipes(updated);
      setMenuSaved(false);
      await saveCurrentMealPlan(updated, ingredients, dietType);
      setRefreshToast(true);
      setTimeout(() => setRefreshToast(false), 2500);
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
        const allMenus = await getSavedMenus();
        setMilestoneMessage(getMilestoneMessage(allMenus.length));
        setMenuSaved(true);
        if (!IS_PREMIUM) setShowUpsell(true);
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
    <View style={styles.root}>
      {refreshToast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>✓  Plan updated &amp; saved</Text>
        </View>
      )}

      {isFromFreshScan && (
        <Animated.View style={[styles.celebrationBanner, { opacity: celebrationOpacity }]} pointerEvents="none">
          <Text style={styles.celebrationText}>
            🎉 Your 7-day {dietConfig.label} plan is ready!
          </Text>
        </Animated.View>
      )}
      <SafeAreaView style={styles.safe}>
      <FlatList
        data={recipes}
        keyExtractor={item => item.day}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Your Week of Meals</Text>
            <Text style={styles.subtitle}>
              7 {dietConfig.emoji} {dietConfig.label} recipes built from {ingredients.length} ingredients.
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

            {menuSaved && milestoneMessage !== '' && (
              <Text style={styles.milestoneText}>{milestoneMessage}</Text>
            )}

            {showUpsell && (
              <View style={styles.upsellBanner}>
                <Text style={styles.upsellText}>
                  Love this? Unlock Keto, Paleo & Vegan for $2.99/mo
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <RecipeCard
            recipe={item}
            onPress={() => navigation.navigate('RecipeDetail', { recipe: item, dietType })}
            onRefresh={() => handleRefreshRecipe(index)}
            refreshing={refreshingDay === item.day}
            refreshDisabled={refreshingDay !== null && refreshingDay !== item.day}
          />
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.replanBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.85}
          >
            <Text style={styles.replanBtnText}>Plan Another Week →</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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

  celebrationBanner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#1d5c63',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  celebrationText: { color: 'white', fontSize: 15, fontWeight: '700' },

  milestoneText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#1d5c63',
    fontWeight: '700',
    marginTop: 10,
  },

  upsellBanner: {
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f4a261',
  },
  upsellText: { fontSize: 14, color: '#555', fontWeight: '500', lineHeight: 20 },

  replanBtn: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#2e86ab',
  },
  replanBtnText: { color: '#2e86ab', fontSize: 16, fontWeight: '700' },
});
