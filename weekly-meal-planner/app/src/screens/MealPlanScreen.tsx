import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe, DietType } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';
import { sortByMeal, mealMeta } from '../constants/mealTypes';
import ConfettiBurst from '../components/ConfettiBurst';
import { saveMenu, getSavedMenus } from '../services/savedMenusService';
import {
  getCurrentMealPlan,
  hasCelebratedDiet,
  markDietCelebrated,
} from '../services/currentMealPlanService';
import {
  getNotificationPermission,
  requestNotificationPermission,
  hasAskedNotificationPermission,
  markNotificationAsked,
  scheduleReplanReminder,
} from '../services/notificationService';
import { IS_PREMIUM } from '../constants/subscription';

type Props = NativeStackScreenProps<RootStackParamList, 'MealPlan'>;

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MealPlanScreen({ navigation, route }: Props) {
  const { ingredients, pantrySavedCount } = route.params;
  const dietType: DietType = route.params.dietType ?? 'mediterranean';
  const glutenFree = route.params.glutenFree ?? false;
  const isSavedView = route.params.saved ?? false;
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const [recipes, setRecipes] = useState<Recipe[]>(route.params.recipes);
  const [saving, setSaving] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);
  const [milestoneMessage, setMilestoneMessage] = useState('');
  const [showUpsell, setShowUpsell] = useState(false);
  const [isFirstOfDiet, setIsFirstOfDiet] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.3)).current;
  const isFromFreshScan = pantrySavedCount != null;

  // For the active plan, re-read storage whenever the screen regains focus so
  // a recipe swapped on the Day screen is reflected here (e.g. for Save Menu).
  // Saved menus are read-only snapshots and must never be overwritten this way.
  useFocusEffect(
    useCallback(() => {
      if (isSavedView) return;
      let active = true;
      getCurrentMealPlan(dietType).then(plan => {
        if (active && plan) setRecipes(plan.recipes);
      });
      return () => { active = false; };
    }, [isSavedView, dietType])
  );

  useEffect(() => {
    if (!isFromFreshScan) return;
    let cancelled = false;
    let reminderTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      // First menu ever of this diet type → big centered confetti celebration.
      const alreadyCelebrated = await hasCelebratedDiet(dietType);
      if (cancelled) return;

      if (!alreadyCelebrated) {
        setIsFirstOfDiet(true);
        setShowConfetti(true);
        markDietCelebrated(dietType);
        // Pop the centered card in with a spring, hold, then fade out.
        Animated.parallel([
          Animated.timing(celebrationOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(celebrationScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        ]).start(() => {
          Animated.sequence([
            Animated.delay(2400),
            Animated.timing(celebrationOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]).start();
        });
      } else {
        // Repeat generation → small top banner only.
        Animated.sequence([
          Animated.timing(celebrationOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(2200),
          Animated.timing(celebrationOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
      }

      // Set up the replan reminder once the celebration has settled, so the
      // permission ask never collides with the confetti moment.
      reminderTimer = setTimeout(() => {
        if (!cancelled) setUpReplanReminder();
      }, alreadyCelebrated ? 800 : 3800);
    })();

    return () => {
      cancelled = true;
      if (reminderTimer) clearTimeout(reminderTimer);
    };
  }, []);

  async function setUpReplanReminder() {
    try {
      let granted = await getNotificationPermission();
      if (!granted) {
        // Only ever ask once; if already granted we just (re)schedule silently.
        if (await hasAskedNotificationPermission()) return;
        const proceed = await new Promise<boolean>(resolve => {
          Alert.alert(
            'Remind you to replan?',
            'We can send one heads-up near the end of the week, when your menu is about to expire — so you can scan a new receipt and refresh your recipes. That’s the only reminder we’ll send.',
            [
              { text: 'No thanks', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Yes, remind me', onPress: () => resolve(true) },
            ]
          );
        });
        await markNotificationAsked();
        if (!proceed) return;
        granted = await requestNotificationPermission();
        if (!granted) return;
      }
      await scheduleReplanReminder(dietType);
    } catch {
      // Reminders are non-essential; never block the flow on failure.
    }
  }

  function getMilestoneMessage(count: number): string {
    if (count === 1) return 'First menu saved!';
    if (count === 2) return 'Two menus saved.';
    if (count === 3) return 'Three menus saved.';
    return `${count} menus saved.`;
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
        Alert.alert('Already saved', 'This exact menu is already in your Menus folder.');
      }
    } catch (e: any) {
      Alert.alert('Couldn’t save your menu', 'Something went wrong saving this. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Group the flat recipe list into days (in calendar order), each day's meals
  // sorted breakfast → lunch → dinner. Days with no recipes are dropped.
  const daysWithMeals = DAY_ORDER
    .map(day => ({ day, meals: sortByMeal(recipes.filter(r => r.day === day)) }))
    .filter(d => d.meals.length > 0);

  const mealTypeCount = new Set(recipes.map(r => r.mealType ?? 'dinner')).size;

  return (
    <View style={styles.root}>
      {isFromFreshScan && !isFirstOfDiet && (
        <Animated.View style={[styles.celebrationBanner, { opacity: celebrationOpacity }]} pointerEvents="none">
          <Text style={styles.celebrationText}>
            🎉 Your {dietConfig.label} menu is ready!
          </Text>
        </Animated.View>
      )}

      {isFirstOfDiet && (
        <>
          <Animated.View style={[styles.celebrationScrim, { opacity: celebrationOpacity }]} pointerEvents="none" />
          <Animated.View style={[styles.centerOverlay, { opacity: celebrationOpacity }]} pointerEvents="none">
            <Animated.View style={{ alignItems: 'center', transform: [{ scale: celebrationScale }] }}>
              <Text style={styles.centerTitle}>You made your first</Text>
              <Text style={styles.centerDiet}>{dietConfig.label} Menu!</Text>
            </Animated.View>
          </Animated.View>
        </>
      )}

      <SafeAreaView style={styles.safe}>
        <FlatList
          data={daysWithMeals}
          keyExtractor={item => item.day}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Your Weekly Menu</Text>
              <Text style={styles.subtitle}>
                {dietConfig.label} · {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
                {mealTypeCount > 1 ? ` across ${mealTypeCount} meals` : ''}.
                Tap a day to see its recipes.
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.dayRow}
              onPress={() =>
                navigation.navigate('Day', {
                  day: item.day,
                  recipes,
                  ingredients,
                  dietType,
                  glutenFree,
                  saved: isSavedView,
                })
              }
              activeOpacity={0.8}
            >
              <View style={styles.dayRowLeft}>
                <Text style={styles.dayName}>{item.day}</Text>
                <View style={styles.mealTagRow}>
                  {item.meals.map(r => {
                    const meta = mealMeta(r.mealType);
                    return (
                      <View key={`${r.day}-${r.mealType ?? 'dinner'}`} style={styles.mealTag}>
                        <Text style={styles.mealTagText}>{meta.emoji} {meta.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <Text style={[styles.dayArrow, { color: dietConfig.color }]}>›</Text>
            </TouchableOpacity>
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

      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  list: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 8 },
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

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dayRowLeft: { flex: 1 },
  dayName: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  mealTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mealTag: {
    backgroundColor: '#f5f0e8',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  mealTagText: { fontSize: 12, color: '#666', fontWeight: '600' },
  dayArrow: { fontSize: 30, fontWeight: '300', marginLeft: 10 },

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

  celebrationScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 140,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    elevation: 12,
  },
  centerTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  centerDiet: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

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
    marginTop: 20,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#2e86ab',
  },
  replanBtnText: { color: '#2e86ab', fontSize: 16, fontWeight: '700' },
});
