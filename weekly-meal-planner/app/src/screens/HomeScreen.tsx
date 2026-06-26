import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, DietType } from '../types';
import { getAllCurrentPlans, CurrentPlan } from '../services/currentMealPlanService';
import { DIET_TYPES, DietConfig } from '../constants/dietTypes';
import { IS_PREMIUM } from '../constants/subscription';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const FREE_DIETS = DIET_TYPES.filter(d => !d.premium);
const PREMIUM_DIETS = DIET_TYPES.filter(d => d.premium);

export default function HomeScreen({ navigation }: Props) {
  const [activePlans, setActivePlans] = useState<CurrentPlan[]>([]);
  const [upgradeModalDiet, setUpgradeModalDiet] = useState<DietConfig | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useFocusEffect(
    useCallback(() => {
      getAllCurrentPlans().then(setActivePlans);
    }, [])
  );

  function handleDietSelect(diet: DietConfig) {
    if (diet.premium && !IS_PREMIUM) {
      setUpgradeModalDiet(diet);
      setWaitlistEmail('');
      setWaitlistSubmitted(false);
      setBillingPeriod('monthly');
      return;
    }
    navigation.navigate('ScanReceipt', { dietType: diet.id });
  }

  function closeUpgradeModal() {
    setUpgradeModalDiet(null);
    setWaitlistEmail('');
    setWaitlistSubmitted(false);
  }

  function handleWaitlistSubmit() {
    if (!waitlistEmail.trim() || !waitlistEmail.includes('@')) return;
    setWaitlistSubmitted(true);
  }

  function getDietConfig(dietType: DietType): DietConfig {
    return DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  }

  const isNewUser = activePlans.length === 0;

  const HeaderContent = (
    <View style={styles.headerOverlay}>
      <Text style={styles.title}>Weekly Meal Planner</Text>
      <Text style={styles.subtitle}>Scan a receipt. Get a full week of recipes.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>

        <View style={[styles.heroImage, styles.heroFallback]}>
          {HeaderContent}
        </View>

        <View style={styles.body}>

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

          {/* Free plans */}
          <View style={styles.tierHeader}>
            <Text style={styles.sectionLabel}>Free plans</Text>
            <View style={styles.freePill}>
              <Text style={styles.freePillText}>ALWAYS FREE</Text>
            </View>
          </View>

          {FREE_DIETS.map(diet => (
            <TouchableOpacity
              key={diet.id}
              style={[styles.featuredCard, { borderColor: diet.color }]}
              onPress={() => handleDietSelect(diet)}
              activeOpacity={0.65}
            >
              <View style={styles.featuredCardInner}>
                <Text style={styles.featuredEmoji}>{diet.emoji}</Text>
                <View style={styles.featuredText}>
                  <View style={styles.featuredLabelRow}>
                    <Text style={[styles.featuredLabel, { color: diet.color }]}>{diet.label}</Text>
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  </View>
                  <Text style={styles.featuredTagline}>{diet.tagline}</Text>
                </View>
                <Text style={[styles.arrow, { color: diet.color }]}>›</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Plan (premium) */}
          <View style={[styles.tierHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionLabel}>Plan</Text>
            <TouchableOpacity onPress={() => handleDietSelect(PREMIUM_DIETS[0])}>
              <Text style={styles.premiumPillText}>Unlock all · $2.99/mo →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dietGrid}>
            {PREMIUM_DIETS.map(diet => (
              <TouchableOpacity
                key={diet.id}
                style={[styles.dietCard, { backgroundColor: diet.accentColor }]}
                onPress={() => handleDietSelect(diet)}
                activeOpacity={0.65}
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

          {/* New-user directed CTA */}
          {isNewUser && (
            <View style={styles.newUserCta}>
              <Text style={styles.newUserCtaText}>
                👆 Tap a plan above to build your first week of meals
              </Text>
            </View>
          )}

          {/* Active plans */}
          {activePlans.length > 0 && (
            <View style={styles.activePlansSection}>
              <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Active plans</Text>
              {activePlans.map(plan => {
                const cfg = getDietConfig(plan.dietType);
                const expiringSoon = plan.daysRemaining <= 2;
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
                      {expiringSoon
                        ? plan.daysRemaining === 1
                          ? '⚠️ Expires today — time to replan!'
                          : '⚠️ Expires tomorrow — time to replan!'
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

      <Modal
        visible={upgradeModalDiet !== null}
        transparent
        animationType="slide"
        onRequestClose={closeUpgradeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeUpgradeModal} />
          <View style={styles.upgradeSheet}>
            <TouchableOpacity style={styles.sheetClose} onPress={closeUpgradeModal}>
              <Text style={styles.sheetCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.sheetEmoji}>{upgradeModalDiet?.emoji}</Text>
            <Text style={[styles.sheetDietName, { color: upgradeModalDiet?.color }]}>
              {upgradeModalDiet?.label}
            </Text>
            <Text style={styles.sheetTaglineText}>{upgradeModalDiet?.tagline}</Text>

            <View style={styles.sheetBenefits}>
              {upgradeModalDiet?.benefits.map((benefit, i) => (
                <View key={i} style={styles.sheetBenefitRow}>
                  <Text style={[styles.sheetBenefitCheck, { color: upgradeModalDiet.color }]}>✓</Text>
                  <Text style={styles.sheetBenefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sheetDivider} />

            {/* Billing toggle */}
            <View style={styles.billingToggle}>
              <TouchableOpacity
                style={[styles.billingOption, billingPeriod === 'monthly' && styles.billingOptionActive]}
                onPress={() => setBillingPeriod('monthly')}
              >
                <Text style={[styles.billingOptionLabel, billingPeriod === 'monthly' && styles.billingOptionLabelActive]}>
                  Monthly
                </Text>
                <Text style={[styles.billingOptionPrice, billingPeriod === 'monthly' && styles.billingOptionPriceActive]}>
                  $2.99/mo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billingOption, billingPeriod === 'annual' && styles.billingOptionActive]}
                onPress={() => setBillingPeriod('annual')}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>2 MONTHS FREE</Text>
                </View>
                <Text style={[styles.billingOptionLabel, billingPeriod === 'annual' && styles.billingOptionLabelActive]}>
                  Annual
                </Text>
                <Text style={[styles.billingOptionPrice, billingPeriod === 'annual' && styles.billingOptionPriceActive]}>
                  $24.99/yr
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetPrice}>
              {billingPeriod === 'annual'
                ? 'Just $2.08/month · less than a cup of coffee'
                : 'Less than a cup of coffee per month'}
            </Text>

            {waitlistSubmitted ? (
              <View style={styles.sheetSuccess}>
                <Text style={styles.sheetSuccessText}>
                  You're on the list! We'll send you 7 days free when {upgradeModalDiet?.label} launches.
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.sheetEmailInput}
                  value={waitlistEmail}
                  onChangeText={setWaitlistEmail}
                  placeholder="Your email address"
                  placeholderTextColor="#bbb"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.sheetJoinBtn,
                    { backgroundColor: upgradeModalDiet?.color },
                    (!waitlistEmail.trim() || !waitlistEmail.includes('@')) && styles.sheetBtnDisabled,
                  ]}
                  onPress={handleWaitlistSubmit}
                  disabled={!waitlistEmail.trim() || !waitlistEmail.includes('@')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sheetJoinBtnText}>Join Waitlist · 7 days free at launch</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.sheetFreeBtn}
              onPress={() => {
                closeUpgradeModal();
                navigation.navigate('ScanReceipt', { dietType: 'mediterranean' });
              }}
            >
              <Text style={styles.sheetFreeBtnText}>Try Mediterranean free →</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  miniSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 4,
  },
  miniStep: { alignItems: 'center', flex: 1 },
  miniStepIcon: { fontSize: 22, marginBottom: 4 },
  miniStepLabel: { fontSize: 11, color: '#555', fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  miniStepArrow: { fontSize: 20, color: '#ccc', fontWeight: '300', marginBottom: 14 },

  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  freePill: {
    backgroundColor: '#2e86ab',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freePillText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  premiumPillText: { fontSize: 13, color: '#c0392b', fontWeight: '700' },

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
  lockBadge: { position: 'absolute', top: 10, right: 10 },
  lockIcon: { fontSize: 14 },
  dietEmoji: { fontSize: 30, marginBottom: 6 },
  dietLabel: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  dietTagline: { fontSize: 12, color: '#666' },

  newUserCta: {
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#f4a261',
  },
  newUserCtaText: { fontSize: 14, color: '#555', fontWeight: '500', lineHeight: 20 },

  activePlansSection: { marginBottom: 16 },
  currentPlanBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  currentPlanTitle: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  currentPlanDays: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' },

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

  // Upgrade modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  upgradeSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 44,
  },
  sheetClose: { position: 'absolute', top: 20, right: 24, padding: 6 },
  sheetCloseText: { fontSize: 18, color: '#aaa', fontWeight: '700' },
  sheetEmoji: { fontSize: 40, marginBottom: 8, marginTop: 8 },
  sheetDietName: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sheetTaglineText: { fontSize: 14, color: '#888', marginBottom: 20 },
  sheetBenefits: { marginBottom: 16 },
  sheetBenefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  sheetBenefitCheck: { fontSize: 16, fontWeight: '800', marginTop: 1 },
  sheetBenefitText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22 },
  sheetDivider: { height: 1, backgroundColor: '#eee', marginBottom: 16 },

  billingToggle: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  billingOption: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
  },
  billingOptionActive: { backgroundColor: '#f0f7fb', borderColor: '#2e86ab' },
  billingOptionLabel: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 4 },
  billingOptionLabelActive: { color: '#1a1a1a' },
  billingOptionPrice: { fontSize: 16, fontWeight: '800', color: '#888' },
  billingOptionPriceActive: { color: '#2e86ab' },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#f4a261',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestValueText: { fontSize: 9, fontWeight: '800', color: 'white', letterSpacing: 0.5 },

  sheetPrice: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },
  sheetEmailInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#eee',
    marginBottom: 12,
  },
  sheetJoinBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  sheetBtnDisabled: { opacity: 0.4 },
  sheetJoinBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  sheetSuccess: { backgroundColor: '#edf7f1', borderRadius: 12, padding: 16, marginBottom: 16 },
  sheetSuccessText: { fontSize: 15, color: '#2d6a4f', lineHeight: 22, fontWeight: '600' },
  sheetFreeBtn: { alignItems: 'center', paddingVertical: 8 },
  sheetFreeBtnText: { color: '#2e86ab', fontSize: 15, fontWeight: '600' },
});
