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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { fetchSceneryPhoto } from '../services/unsplashService';
import { getCurrentMealPlan, CurrentPlan } from '../services/currentMealPlanService';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [coastPhotoUrl, setCoastPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);

  useEffect(() => {
    fetchSceneryPhoto('mediterranean coast sea greece santorini')
      .then(url => setCoastPhotoUrl(url))
      .finally(() => setPhotoLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      getCurrentMealPlan().then(setCurrentPlan);
    }, [])
  );

  const HeaderContent = (
    <View style={styles.headerOverlay}>
      <Text style={styles.title}>Weekly Meal Planner</Text>
      <Text style={styles.subtitle}>Mediterranean diet · Powered by your pantry</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>

        {/* Hero header */}
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ready to plan your week?</Text>
            <Text style={styles.cardBody}>
              Scan your grocery receipt and add your pantry items. We'll generate
              7 Mediterranean diet recipes tailored to what you have on hand.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('ScanReceipt')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>📸  Start New Meal Plan</Text>
          </TouchableOpacity>

          {currentPlan && (
            <TouchableOpacity
              style={styles.currentPlanBtn}
              onPress={() =>
                navigation.navigate('MealPlan', {
                  recipes: currentPlan.recipes,
                  ingredients: currentPlan.ingredients,
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.currentPlanTitle}>📋  Current Meal Plan</Text>
              <Text style={styles.currentPlanDays}>
                {currentPlan.daysRemaining === 1
                  ? 'Expires today'
                  : `${currentPlan.daysRemaining} days remaining`}
              </Text>
            </TouchableOpacity>
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
              ['1', 'Photograph your grocery receipt'],
              ['2', 'Add items already in your pantry'],
              ['3', 'Get 7 Mediterranean recipes generated for you'],
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
            Recipes follow Mayo Clinic Mediterranean diet guidelines
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

  heroImage: {
    width: '100%',
    height: 240,
  },
  heroImageStyle: {
    resizeMode: 'cover',
  },
  heroFallback: {
    backgroundColor: '#2e86ab',
    justifyContent: 'flex-end',
  },
  heroScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
    background: 'transparent',
    // gradient overlay so text is always readable over photo
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  headerOverlay: {
    padding: 24,
    paddingTop: 48,
  },
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

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  cardBody: { fontSize: 14, color: '#555', lineHeight: 22 },

  primaryBtn: {
    backgroundColor: '#2e86ab',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },

  currentPlanBtn: {
    backgroundColor: '#1d5c63',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  currentPlanTitle: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 2 },
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
