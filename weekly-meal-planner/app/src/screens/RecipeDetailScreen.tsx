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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { saveRecipe, unsaveRecipe, isRecipeSaved } from '../services/savedRecipesService';
import { DIET_TYPES } from '../constants/dietTypes';
import RecipeShareCard from '../components/RecipeShareCard';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export default function RecipeDetailScreen({ route }: Props) {
  const { recipe, dietType = 'mediterranean' } = route.params;
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const shareRef = useRef<View>(null);

  useEffect(() => {
    isRecipeSaved(recipe).then(setSaved);
  }, []);

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

  async function handleShare() {
    setSharing(true);
    try {
      // The off-screen card's hero is a local file already shown above, so it's
      // warm in the image cache; a short settle keeps capture from racing layout.
      if (recipe.photoUrl) await new Promise(r => setTimeout(r, 200));
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
        {recipe.photoUrl ? (
          <Image source={{ uri: recipe.photoUrl }} style={styles.hero} />
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
              <Text style={styles.macrosTitle}>Nutrition · per serving</Text>
              <View style={styles.macrosRow}>
                {([
                  ['CAL', `${recipe.nutrition.calories}`],
                  ['PROTEIN', `${recipe.nutrition.protein}g`],
                  ['CARBS', `${recipe.nutrition.carbs}g`],
                  ['SUGAR', `${recipe.nutrition.sugar}g`],
                  ['SODIUM', `${recipe.nutrition.sodium}mg`],
                ] as const).map(([label, value]) => (
                  <View key={label} style={styles.macroItem}>
                    <Text style={styles.macroValue}>{value}</Text>
                    <Text style={styles.macroLabel}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.macrosDisclaimer}>
                Estimated for general guidance — not medical or dietary advice.
              </Text>
            </View>
          )}

          <View style={styles.nutritionBox}>
            <Text style={styles.nutritionIcon}>🌿</Text>
            <Text style={styles.nutritionText}>{recipe.nutritionNotes}</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnSaved]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>
                {saved ? '🔖  Saved to Recipes' : '🔖  Save Recipe'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.85}
          >
            {sharing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.shareBtnText}>Share Recipe Card</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.sourceNote}>{dietConfig.source}</Text>
        </View>
      </ScrollView>

      {/* Off-screen render target captured to a PNG for sharing. */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={shareRef} collapsable={false}>
          <RecipeShareCard recipe={recipe} dietType={dietType} />
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
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 20,
  },
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
  metaLabel: { fontSize: 10, color: '#aaa', fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  metaValue: { fontSize: 16, fontWeight: '700', color: '#2e86ab' },
  divider: { width: 1, backgroundColor: '#eee', marginHorizontal: 8 },
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
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 16, fontWeight: '800', color: '#2e86ab' },
  macroLabel: { fontSize: 9, color: '#aaa', fontWeight: '700', letterSpacing: 0.5, marginTop: 3 },
  macrosDisclaimer: {
    fontSize: 11,
    color: '#aaa',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
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
  saveBtn: {
    backgroundColor: '#2e86ab',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnSaved: {
    backgroundColor: '#1d5c63',
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  shareBtn: {
    backgroundColor: '#f4a261',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  sourceNote: { textAlign: 'center', fontSize: 11, color: '#aaa', marginBottom: 24 },
});
