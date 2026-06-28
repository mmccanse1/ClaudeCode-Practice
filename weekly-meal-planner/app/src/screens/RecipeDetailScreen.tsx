import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, NutritionPremium } from '../types';
import { saveRecipe, unsaveRecipe, isRecipeSaved } from '../services/savedRecipesService';
import { fetchFoodPhoto } from '../services/unsplashService';
import { printRecipe } from '../services/recipePrint';
import { DIET_TYPES } from '../constants/dietTypes';
import { IS_PREMIUM } from '../constants/subscription';
import RecipeShareCard from '../components/RecipeShareCard';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

// Premium detailed nutrition, grouped for display (per the nutritionist spec).
function premiumGroups(p: NutritionPremium) {
  return [
    { title: 'Carb detail', rows: [
      ['Fiber', `${p.fiber} g`],
      ['Net carbs', `${p.netCarbs} g`],
      ['Added sugar', `${p.addedSugar} g`],
    ] },
    { title: 'Fat & cholesterol', rows: [
      ['Saturated fat', `${p.saturatedFat} g`],
      ['Cholesterol', `${p.cholesterol} mg`],
      ['Omega-3', `${p.omega3} mg`],
    ] },
    { title: 'Micronutrients', rows: [
      ['Potassium', `${p.potassium} mg`],
      ['Magnesium', `${p.magnesium} mg`],
      ['Calcium', `${p.calcium} mg`],
      ['Iron', `${p.iron} mg`],
      ['Vitamin D', `${p.vitaminD} mcg`],
      ['Vitamin B12', `${p.vitaminB12} mcg`],
    ] },
  ];
}

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export default function RecipeDetailScreen({ route }: Props) {
  const { recipe, dietType = 'mediterranean' } = route.params;
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Photo shown in the hero / share card. Starts from the recipe's stored URL but
  // can be filled in lazily below if it arrived here without one.
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(recipe.photoUrl);
  const [premiumOpen, setPremiumOpen] = useState(true);
  const shareRef = useRef<View>(null);

  useEffect(() => {
    isRecipeSaved(recipe).then(setSaved);
  }, []);

  // Recover a missing image: if generation failed earlier (no key, quota, or a
  // transient error) the card landed here without a photo. Try once more on open
  // so the recipe doesn't stay stuck on the placeholder emoji.
  useEffect(() => {
    if (photoUrl) return;
    let active = true;
    fetchFoodPhoto(recipe.searchQuery)
      .then(url => { if (active && url) setPhotoUrl(url); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const heroRecipe = { ...recipe, photoUrl };

  async function handleSave() {
    setSaving(true);
    try {
      if (saved) {
        await unsaveRecipe(recipe);
        setSaved(false);
        Alert.alert('Removed', `${recipe.name} removed from Saved Recipes.`);
      } else {
        await saveRecipe(recipe);
        setSaved(true);
        Alert.alert('Saved!', `${recipe.name} added to your Saved Recipes folder.`);
      }
    } catch (e: any) {
      Alert.alert('Couldn’t save recipe', 'We couldn’t save this to your Saved Recipes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint() {
    if (printing) return;
    setPrinting(true);
    try {
      await printRecipe(heroRecipe, dietConfig.label);
    } catch (e: any) {
      Alert.alert('Couldn’t open the printout', 'Something went wrong preparing the printable recipe. Please try again.');
    } finally {
      setPrinting(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      // The off-screen card's hero is a local file already shown above, so it's
      // warm in the image cache; a short settle keeps capture from racing layout.
      if (photoUrl) await new Promise(r => setTimeout(r, 200));
      const uri = await captureRef(shareRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: recipe.name });
      }
    } catch (e: any) {
      Alert.alert('Couldn’t create the share card', 'Something went wrong building your recipe card. Please try sharing again.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.hero} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroEmoji}>🫒</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayText}>{recipe.day}</Text>
            </View>
            <View style={styles.dietBadge}>
              <Text style={styles.dietText}>{dietConfig.label} Diet</Text>
            </View>
          </View>

          <Text style={styles.name}>{recipe.name}</Text>
          <Text style={styles.description}>{recipe.description}</Text>

          {recipe.pairingNote ? (
            <View style={styles.pairingCard}>
              <Text style={styles.pairingIcon}>🍽</Text>
              <Text style={styles.pairingText}>{recipe.pairingNote}</Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>PREP</Text>
              <Text style={styles.metaValue}>{recipe.prepTime}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>COOK</Text>
              <Text style={styles.metaValue}>{recipe.cookTime}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>SERVES</Text>
              <Text style={styles.metaValue}>{recipe.servings}</Text>
            </View>
          </View>

          {/* Primary actions — icon-only, evenly spaced in a horizontal row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.iconBtn, styles.saveBtn, saved && styles.saveBtnSaved]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Saved' : 'Save'}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <MaterialCommunityIcons name={saved ? 'bookmark' : 'bookmark-outline'} size={26} color="white" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, styles.shareBtn]}
              onPress={handleShare}
              disabled={sharing}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              {sharing ? (
                <ActivityIndicator color="white" />
              ) : (
                <MaterialCommunityIcons name="share" size={26} color="white" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, styles.printBtn]}
              onPress={handlePrint}
              disabled={printing}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Print"
            >
              {printing ? (
                <ActivityIndicator color="#2e86ab" />
              ) : (
                <MaterialCommunityIcons name="printer-outline" size={26} color="#2e86ab" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <View style={styles.ingredientDot} />
              <Text style={styles.ingredientText}>{ing}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Instructions</Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          {recipe.nutrition && (
            <View style={styles.macrosCard}>
              <Text style={styles.macrosTitle}>Estimated nutrition · per serving</Text>
              <View style={styles.macrosRow}>
                {([
                  ['CAL', `${recipe.nutrition.calories}`],
                  ['PROTEIN', `${recipe.nutrition.protein}g`],
                  ['CARBS', `${recipe.nutrition.carbs}g`],
                  ['FAT', `${recipe.nutrition.fat ?? 0}g`],
                  ['SUGAR', `${recipe.nutrition.sugar}g`],
                  ['SODIUM', `${recipe.nutrition.sodium}mg`],
                ] as const).map(([label, value]) => (
                  <View key={label} style={styles.macroItem}>
                    <Text style={styles.macroValue} numberOfLines={1} allowFontScaling={false}>{value}</Text>
                    <Text style={styles.macroLabel} numberOfLines={1} allowFontScaling={false}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.macrosDisclaimer}>
                Estimated for general guidance — not medical or dietary advice.
              </Text>
            </View>
          )}

          {/* Premium detailed nutrition — gated on Pro. */}
          {IS_PREMIUM ? (
            recipe.nutritionPremium ? (
              <View style={styles.premiumCard}>
                <TouchableOpacity
                  style={styles.premiumHeader}
                  onPress={() => setPremiumOpen(o => !o)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.premiumTitle}>Detailed nutrition · per serving</Text>
                  <Text style={styles.premiumChevron}>{premiumOpen ? '▾' : '▸'}</Text>
                </TouchableOpacity>
                {premiumOpen && (
                  <>
                    {premiumGroups(recipe.nutritionPremium).map(group => (
                      <View key={group.title} style={styles.premiumGroup}>
                        <Text style={styles.premiumGroupTitle}>{group.title}</Text>
                        {group.rows.map(([label, value]) => (
                          <View key={label} style={styles.premiumRow}>
                            <Text style={styles.premiumRowLabel}>{label}</Text>
                            <Text style={styles.premiumRowValue}>{value}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                    <Text style={styles.macrosDisclaimer}>
                      AI-estimated per serving for general guidance only — not medical or dietary advice.
                    </Text>
                  </>
                )}
              </View>
            ) : (
              <Text style={styles.premiumUnavailable}>
                Detailed nutrition isn't available for this recipe — regenerate it to see the full breakdown.
              </Text>
            )
          ) : (
            <View style={styles.premiumLockedCard}>
              <Text style={styles.premiumLockedTitle}>🔒  Detailed macros & micronutrients</Text>
              <Text style={styles.premiumLockedSub}>
                Fiber, net carbs, added sugar, saturated fat, cholesterol, omega-3, potassium, magnesium, calcium, iron, vitamin D & B12 — unlock with Pro.
              </Text>
            </View>
          )}

          <View style={styles.nutritionBox}>
            <Text style={styles.nutritionIcon}>🌿</Text>
            <Text style={styles.nutritionText}>{recipe.nutritionNotes}</Text>
          </View>

          <Text style={styles.sourceNote}>{dietConfig.source}</Text>
        </View>
      </ScrollView>

      {/* Off-screen render target captured to a PNG for sharing. */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={shareRef} collapsable={false}>
          <RecipeShareCard recipe={heroRecipe} dietType={dietType} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
  hero: { width: '100%', height: 280, resizeMode: 'cover' },
  heroPlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#a8dadc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 80 },
  body: { padding: 24 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dayBadge: {
    backgroundColor: '#2e86ab',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  dayText: { color: 'white', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  dietBadge: {
    backgroundColor: '#e8f8f9',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dietText: { color: '#1d5c63', fontSize: 12, fontWeight: '600' },
  name: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  description: {
    fontSize: 15,
    color: '#5b7a8c',
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 20,
  },
  // Side-dish pairing callout (only present on sides).
  pairingCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#a8dadc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  pairingIcon: { fontSize: 18 },
  pairingText: { flex: 1, fontSize: 14, color: '#1d5c63', fontWeight: '600', lineHeight: 20 },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 10, color: '#9bb4c2', fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  metaValue: { fontSize: 16, fontWeight: '700', color: '#2e86ab' },
  divider: { width: 1, backgroundColor: '#eef4f8', marginHorizontal: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#a8dadc',
    paddingBottom: 6,
    marginBottom: 14,
    marginTop: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#f4a261',
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f4a261',
    marginRight: 10,
  },
  ingredientText: { fontSize: 14, color: '#333', flex: 1 },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2e86ab',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: { color: 'white', fontWeight: '700', fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 22 },
  macrosCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  macrosTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5b7a8c',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  // 3 per row, wrapping to 2 rows — gives each value enough width to render in
  // full (no wrap, no "…" truncation on 4-digit sodium values).
  macrosRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  macroItem: { width: '33.333%', alignItems: 'center' },
  macroValue: { fontSize: 15, fontWeight: '800', color: '#2e86ab' },
  macroLabel: { fontSize: 9, color: '#9bb4c2', fontWeight: '700', letterSpacing: 0.3, marginTop: 3 },
  macrosDisclaimer: {
    fontSize: 11,
    color: '#9bb4c2',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  premiumCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#eef4f8',
  },
  premiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  premiumTitle: { fontSize: 12, fontWeight: '700', color: '#5b7a8c', textTransform: 'uppercase', letterSpacing: 0.6 },
  premiumChevron: { fontSize: 14, color: '#9bb4c2' },
  premiumGroup: { marginTop: 14 },
  premiumGroupTitle: { fontSize: 11, fontWeight: '700', color: '#9bb4c2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  premiumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f7fa' },
  premiumRowLabel: { fontSize: 14, color: '#333' },
  premiumRowValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '700' },
  premiumUnavailable: { fontSize: 13, color: '#9bb4c2', fontStyle: 'italic', marginTop: 14, lineHeight: 19 },
  premiumLockedCard: {
    backgroundColor: '#fff8f0',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#f4d8bf',
    borderStyle: 'dashed',
  },
  premiumLockedTitle: { fontSize: 15, fontWeight: '800', color: '#c07030', marginBottom: 4 },
  premiumLockedSub: { fontSize: 13, color: '#5b7a8c', lineHeight: 19 },
  nutritionBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#a8dadc',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    marginBottom: 24,
  },
  nutritionIcon: { fontSize: 20 },
  nutritionText: { flex: 1, fontSize: 13, color: '#1d5c63', lineHeight: 20 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  iconBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: { backgroundColor: '#2e86ab' },
  saveBtnSaved: { backgroundColor: '#1d5c63' },
  shareBtn: { backgroundColor: '#f4a261' },
  printBtn: { backgroundColor: 'white', borderWidth: 1.5, borderColor: '#2e86ab' },
  sourceNote: { textAlign: 'center', fontSize: 11, color: '#9bb4c2', marginBottom: 24 },
});
