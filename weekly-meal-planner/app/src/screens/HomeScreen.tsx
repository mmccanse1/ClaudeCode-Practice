import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, DietType } from '../types';
import { getAllCurrentPlans, hasEverGeneratedPlan, CurrentPlan } from '../services/currentMealPlanService';
import { getPantryItems } from '../services/pantryService';
import { DIET_TYPES, DietConfig } from '../constants/dietTypes';
import Dropdown, { DropdownOption } from '../components/Dropdown';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// All diets are free; this is simply every diet, kept as a named list.
const FREE_DIETS = DIET_TYPES.filter(d => !d.premium);

function planDaysLabel(plan: CurrentPlan): string {
  if (plan.daysRemaining <= 0) return 'Expires today — time to replan!';
  if (plan.daysRemaining === 1) return 'Expires tomorrow — time to replan!';
  return `${plan.daysRemaining} days remaining`;
}

export default function HomeScreen({ navigation }: Props) {
  const [activePlans, setActivePlans] = useState<CurrentPlan[]>([]);
  const [hasMadePlan, setHasMadePlan] = useState(false);
  const [pantryCount, setPantryCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getAllCurrentPlans().then(setActivePlans);
      hasEverGeneratedPlan().then(setHasMadePlan);
      getPantryItems().then(items => setPantryCount(items.length));
    }, [])
  );

  function getDietConfig(dietType: DietType): DietConfig {
    return DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  }

  function handleDietSelect(option: DropdownOption) {
    navigation.navigate('ScanReceipt', { dietType: option.id as DietType });
  }

  function handleMenuSelect(option: DropdownOption) {
    const plan = activePlans.find(p => p.dietType === option.id);
    if (!plan) return;
    navigation.navigate('MealPlan', {
      recipes: plan.recipes,
      ingredients: plan.ingredients,
      dietType: plan.dietType,
    });
  }

  const isNewUser = activePlans.length === 0;
  // True once the user has earned their first "aha" — either the persisted flag,
  // or an active plan (covers users from before the flag existed). Gates the
  // empty-until-used Saved Recipes shortcut.
  const hasActivated = hasMadePlan || activePlans.length > 0;

  const dietOptions: DropdownOption[] = FREE_DIETS.map(d => ({
    id: d.id,
    label: d.label,
    color: d.color,
    sublabel: d.tagline,
  }));

  const menuOptions: DropdownOption[] = activePlans.map(plan => {
    const cfg = getDietConfig(plan.dietType);
    return {
      id: plan.dietType,
      label: `${cfg.label} Menu`,
      color: cfg.color,
      sublabel: planDaysLabel(plan),
    };
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>

        <ImageBackground
          source={require('../../assets/hero-meal.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <View style={styles.headerOverlay}>
            <Text style={styles.title}>Weekly Meal Planner</Text>
            <Text style={styles.subtitle}>
              Snap your receipt and our chefs plan 7 dinners from it — no sign-up.
            </Text>
          </View>
        </ImageBackground>

        <View style={styles.body}>

          <View style={styles.howItWorks}>
            <Text style={styles.howTitle}>How it works</Text>
            {[
              ['1', 'Choose your diet'],
              ['2', 'Photograph your receipt or add pantry items'],
              ['3', 'Get 7 recipes from groceries you already have'],
              ['4', 'Save and share your recipe cards'],
            ].map(([num, text]) => (
              <View key={num} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{num}</Text>
                </View>
                <Text style={styles.stepText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Choose a Diet — dropdown; picking one starts the scan flow */}
          <Dropdown
            label="Choose a Diet"
            placeholder="Pick a diet to start →"
            options={dietOptions}
            onSelect={handleDietSelect}
            accentColor="#2e86ab"
          />

          {/* New-user directed CTA */}
          {isNewUser && (
            <View style={styles.newUserCta}>
              <Text style={styles.newUserCtaText}>
                Pick a diet above to build your first week of meals
              </Text>
            </View>
          )}

          {/* Current Menus — dropdown filtered by diet type */}
          {activePlans.length > 0 && (
            <Dropdown
              label="Current Menus"
              placeholder={`View a menu (${activePlans.length}) →`}
              options={menuOptions}
              onSelect={handleMenuSelect}
              accentColor="#f4a261"
            />
          )}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Pantry')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>🗄  Manage Pantry</Text>
          </TouchableOpacity>

          {/* Pantry as an active ingredient resource (Option C) */}
          <Text style={styles.pantryStatus}>
            {pantryCount > 0
              ? `Pantry: ${pantryCount} item${pantryCount !== 1 ? 's' : ''} ready`
              : 'Pantry: 0 items — add some to cook from your shelves'}
          </Text>

          {hasActivated && (
            <TouchableOpacity
              style={styles.savedBtn}
              onPress={() => navigation.navigate('SavedRecipes')}
              activeOpacity={0.85}
            >
              <Text style={styles.savedBtnText}>🔖  Saved Recipes & Menus</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.source}>
            AI-generated recipes for general guidance, not medical advice
          </Text>

          <View style={styles.legalFooter}>
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://mmccanse1.github.io/ClaudeCode-Practice/privacy-policy.html')}
            >
              Privacy Policy
            </Text>
            <Text style={styles.legalSep}> · </Text>
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://mmccanse1.github.io/ClaudeCode-Practice/terms-of-service.html')}
            >
              Terms of Service
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  container: { flexGrow: 1 },

  heroImage: { width: '100%', height: 158, justifyContent: 'flex-end', backgroundColor: '#2e86ab' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  headerOverlay: { padding: 18, paddingTop: 36 },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: 'white',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },

  // How it works — shrunk ~10% from the prior sizing to reclaim vertical space.
  howItWorks: { marginBottom: 18 },
  howTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 11, gap: 12 },
  stepNum: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#2e86ab',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: 'white', fontWeight: '700', fontSize: 13 },
  stepText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 18 },

  newUserCta: {
    backgroundColor: '#eaf3f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#2e86ab',
  },
  newUserCtaText: { fontSize: 13, color: '#3a5663', fontWeight: '500', lineHeight: 19 },

  secondaryBtn: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#2e86ab',
  },
  secondaryBtnText: { color: '#2e86ab', fontSize: 16, fontWeight: '700' },

  pantryStatus: {
    textAlign: 'center',
    fontSize: 12,
    color: '#5b7a8c',
    fontWeight: '600',
    marginBottom: 14,
  },

  savedBtn: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#f4a261',
  },
  savedBtnText: { color: '#f4a261', fontSize: 16, fontWeight: '700' },

  source: { textAlign: 'center', fontSize: 11, color: '#9bb4c2', marginBottom: 8 },

  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  legalLink: { fontSize: 11, color: '#9bb4c2' },
  legalSep: { fontSize: 11, color: '#9bb4c2' },
});
