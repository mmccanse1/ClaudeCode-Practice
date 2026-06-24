import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, DietType } from '../types';
import { fetchSceneryPhoto } from '../services/unsplashService';
import { getAllCurrentPlans, CurrentPlan } from '../services/currentMealPlanService';
import { DIET_TYPES, DietConfig } from '../constants/dietTypes';
import { IS_PREMIUM } from '../constants/subscription';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [coastPhotoUrl, setCoastPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [activePlans, setActivePlans] = useState<CurrentPlan[]>([]);

  useEffect(() => {
    fetchSceneryPhoto('mediterranean coast sea greece santorini')
      .then(url => setCoastPhotoUrl(url))
      .finally(() => setPhotoLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      getAllCurrentPlans().then(setActivePlans);
    }, [])
  );

  function handleDietSelect(diet: DietConfig) {
    if (diet.premium && !IS_PREMIUM) {
      Alert.alert(
        `${diet.label} — Planner Plan`,
        `Unlock ${diet.label} meal plans and 4 other diet types for $2.99/month.\n\nUpgrade coming soon!`,
        [{ text: 'OK' }]
      );
      return;
    }
    navigation.navigate('ScanReceipt', { dietType: diet.id });
  }

  function getDietConfig(dietType: DietType): DietConfig {
    return DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  }

  const HeaderContent = (
    <View style={styles.headerOverlay}>
      <Text style={styles.title}>Weekly Meal Planner</Text>
      <Text style={styles.subtitle}>5 diet plans · Powered by your pantry</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>

        {coastPhotoUrl ? (
          <ImageBackground
            source={{ uri: coastPhotoUrl }}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}
          >
            <View style={styles.heroScrim}>{HeaderContent}</View>
          </ImageBackground>
        ) : (
          <View style={[styles.heroImage, styles.heroFallback]}>
            {photoLoading ? (
              <ActivityIndicator color="white" style={{ marginBottom: 12 }} />
            ) : null}
            {HeaderContent}
          </View>
        )}

        <View style={styles.body}>

          <Text style={styles.sectionLabel}>Choose your diet plan</Text>

          {/* Mediterranean — featured free card */}
          <TouchableOpacity
            style={[styles.featuredCard, { borderColor: DIET_TYPES[0].color }]}
            onPress={() => handleDietSelect(DIET_TYPES[0])}
            activeOpacity={0.85}
          >
            <View style={styles.featuredCardInner}>
              <Text style={styles.featuredEmoji}>{DIET_TYPES[0].emoji}</Text>
              <View style={styles.featuredText}>
                <View style={styles.featuredLabelRow}>
                  <Text style={[styles.featuredLabel, { color: DIET_TYPES[0].color }]}>
                    {DIET_TYPES[0].label}
                  </Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>FREE</Text>
                  </View>
                </View>
                <Text style={styles.featuredTagline}>{DIET_TYPES[0].tagline}</Text>
              </View>
              <Text style={[styles.arrow, { color: DIET_TYPES[0].color }]}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Premium diet cards — 2 column grid */}
          <View style={styles.dietGrid}>
            {DIET_TYPES.slice(1).map(diet => (
              <TouchableOpacity
                key={diet.id}
                style={[styles.dietCard, { backgroundColor: diet.accentColor }]}
                onPress={() => handleDietSelect(diet)}
                activeOpacity={0.82}
              >
                <View style={styles.lockBadge}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
                <Text style={styles.dietEmoji}>{diet.emoji}</Text>
                <Text style={[styles.dietLabel, { color: diet.color }]}>{diet.label}</Text>
                <Text style={styles.dietTagline}>{diet.tagline}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.upgradeHint}>
            Unlock Keto, Paleo, Vegetarian & Vegan — Planner plan $2.99/mo
          </Text>

          {/* Active plans */}
          {activePlans.length > 0 && (
            <View style={styles.activePlansSection}>
              <Text style={styles.sectionLabel}>Active plans</Text>
              {activePlans.map(plan => {
                const cfg = getDietConfig(plan.dietType);
                return (
                  <TouchableOpacity
                    key={plan.dietType}
                    style={[styles.currentPlanBtn, { backgroundColor: cfg.color }]}
                    onPress={() =>
                      navigation.navigate('MealPlan', {
                        recipes: plan.recipes,
                        ingredients: plan.ingredients,
                        dietType: plan.dietType,
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.currentPlanTitle}>
                      {cfg.emoji}  {cfg.label} Meal Plan
                    </Text>
                    <Text style={styles.currentPlanDays}>
                      {plan.daysRemaining === 1
                        ? 'Expires today'
                        : `${plan.daysRemaining} days remaining`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Pantry')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>🗄  Manage Pantry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.savedBtn}
            onPress={() => navigation.navigate('SavedRecipes')}
            activeOpacity={0.85}
          >
            <Text style={styles.savedBtnText}>🔖  Saved Recipes & Menus</Text>
          </TouchableOpacity>

          <View style={styles.howItWorks}>
            <Text style={styles.howTitle}>How it works</Text>
            {[
              ['1', 'Choose your diet plan'],
              ['2', 'Photograph your grocery receipt or add pantry items'],
              ['3', 'Get 7 AI-generated recipes tailored to your diet and pantry'],
              ['4', 'Save and share beautifully formatted recipe cards'],
            ].map(([num, text]) => (
              <View key={num} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{num}</Text>
                </View>
                <Text style={styles.stepText}>{text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.source}>
            Mediterranean recipes follow Mayo Clinic diet guidelines
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

  heroImage: { width: '100%', height: 220 },
  heroImageStyle: { resizeMode: 'cover' },
  heroFallback: { backgroundColor: '#2e86ab', justifyContent: 'flex-end' },
  heroScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  headerOverlay: { padding: 24, paddingTop: 48 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  body: { padding: 24 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },

  featuredCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featuredCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featuredEmoji: { fontSize: 36 },
  featuredText: { flex: 1 },
  featuredLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  featuredLabel: { fontSize: 18, fontWeight: '800' },
  freeBadge: {
    backgroundColor: '#2e86ab',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  freeBadgeText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  featuredTagline: { fontSize: 13, color: '#777' },
  arrow: { fontSize: 28, fontWeight: '300', marginLeft: 4 },

  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  dietCard: {
    width: '47.5%',
    borderRadius: 14,
    padding: 14,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  lockIcon: { fontSize: 14 },
  dietEmoji: { fontSize: 30, marginBottom: 6 },
  dietLabel: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  dietTagline: { fontSize: 12, color: '#666' },

  upgradeHint: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },

  activePlansSection: { marginBottom: 16 },

  currentPlanBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  currentPlanTitle: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  currentPlanDays: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },

  secondaryBtn: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#2e86ab',
  },
  secondaryBtnText: { color: '#2e86ab', fontSize: 17, fontWeight: '700' },

  savedBtn: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: '#f4a261',
  },
  savedBtnText: { color: '#f4a261', fontSize: 17, fontWeight: '700' },

  howItWorks: { marginBottom: 24 },
  howTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 14 },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2e86ab',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: 'white', fontWeight: '700', fontSize: 14 },
  stepText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 20 },

  source: { textAlign: 'center', fontSize: 11, color: '#aaa', marginBottom: 8 },

  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  legalLink: { fontSize: 11, color: '#aaa' },
  legalSep: { fontSize: 11, color: '#aaa' },
});
