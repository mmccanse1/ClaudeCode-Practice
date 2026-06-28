import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, DietType, MealType } from '../types';
import { MEAL_TYPES } from '../constants/mealTypes';
import {
  parseReceiptFromImage,
  generateMealPlan,
  RATE_LIMIT_ERROR,
  AI_PARSE_ERROR,
} from '../services/claudeService';
import { getPantryItems, addPantryItems } from '../services/pantryService';
import { fetchFoodPhoto } from '../services/unsplashService';
import { saveCurrentMealPlan, hasEverGeneratedPlan } from '../services/currentMealPlanService';
import { DIET_TYPES } from '../constants/dietTypes';

// Shared produce/aromatics every sample pantry starts from — diet-neutral.
const SAMPLE_BASE: string[] = [
  'olive oil', 'garlic', 'cherry tomatoes', 'bell peppers',
  'zucchini', 'lemon', 'baby spinach', 'red onion', 'canned diced tomatoes',
];

// Diet-appropriate proteins/staples added on top of the base. A vegetarian or
// vegan user must never be handed chicken/eggs in their "sample pantry".
const SAMPLE_PROTEINS: Record<DietType, string[]> = {
  mediterranean: ['chicken breast', 'eggs', 'canned chickpeas', 'pasta'],
  keto:          ['chicken breast', 'eggs', 'avocado', 'shredded cheese'],
  paleo:         ['chicken breast', 'eggs', 'sweet potato', 'almonds'],
  vegetarian:    ['eggs', 'canned chickpeas', 'pasta', 'feta cheese'],
  vegan:         ['firm tofu', 'canned chickpeas', 'red lentils', 'quinoa'],
};

function samplePantryFor(diet: DietType): string[] {
  return [...SAMPLE_BASE, ...(SAMPLE_PROTEINS[diet] ?? SAMPLE_PROTEINS.mediterranean)];
}

type Props = NativeStackScreenProps<RootStackParamList, 'ScanReceipt'>;

const GENERATING_STEPS = [
  'Our chefs are thinking…',
  'Chopping fresh veggies…',
  'Whipping up recipes…',
  'Sauces are simmering…',
  'Seasoning to taste…',
  'Plating your dishes…',
  'Dinner is served!',
];

export default function ScanReceiptScreen({ navigation, route }: Props) {
  const { dietType } = route.params;
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];

  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = useState('');
  // Manual add is collapsed by default (keeps the screen clean) and expands on
  // tap — it stays available as the OCR-miss recovery path and no-scan entry.
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [lowSalt, setLowSalt] = useState(false);
  const [diabetic, setDiabetic] = useState(false);
  // Pantry chosen as the source (instead of scanning). Reveals the meal/dietary
  // options + Generate WITHOUT generating — generation only fires on the bottom
  // Generate button.
  const [usePantry, setUsePantry] = useState(false);
  // First-time users get the "sample pantry" helper; hide it once they've made a plan.
  const [hasGeneratedBefore, setHasGeneratedBefore] = useState(false);
  // Which meals to build. Dinner on by default keeps the original one-tap flow.
  const [meals, setMeals] = useState<Record<MealType, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: true,
  });
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [pantryCount, setPantryCount] = useState(0);
  const [progressStep, setProgressStep] = useState(0);
  const [generatingStep, setGeneratingStep] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flowCompletedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isGeneratingRef = useRef(false);
  const isParsingRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    isMountedRef.current = true;
    getPantryItems().then(pantryItems => setPantryCount(pantryItems.length));
    hasEverGeneratedPlan().then(setHasGeneratedBefore);
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (!generating) {
      setProgressStep(0);
      fadeAnim.setValue(1);
      return;
    }
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setProgressStep(prev => Math.min(prev + 1, 3));
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    if (generating) {
      setGeneratingStep(0);
      stepTimerRef.current = setInterval(() => {
        setGeneratingStep(prev => Math.min(prev + 1, GENERATING_STEPS.length - 1));
      }, 3000);
    } else {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setGeneratingStep(0);
    }
    return () => { if (stepTimerRef.current) clearInterval(stepTimerRef.current); };
  }, [generating]);

  useFocusEffect(
    useCallback(() => {
      if (flowCompletedRef.current) {
        flowCompletedRef.current = false;
        setReceiptUri(null);
        setItems([]);
        setChecked({});
        setNewItem('');
        setShowManualAdd(false);
        setGlutenFree(false);
        setLowSalt(false);
        setDiabetic(false);
        setUsePantry(false);
        setMeals({ breakfast: false, lunch: false, dinner: true });
        setRetryCountdown(0);
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    }, [])
  );

  function startRetryCountdown(seconds: number) {
    setRetryCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function mergeItems(newItems: string[]) {
    const deduped = [...new Set(newItems.map(i => i.trim().toLowerCase()))];
    setItems(prev => {
      const normalizedPrev = prev.map(i => i.trim().toLowerCase());
      return [...new Set([...normalizedPrev, ...deduped])];
    });
    setChecked(prev => {
      const next: Record<string, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => { next[k.trim().toLowerCase()] = v; });
      deduped.forEach(i => { if (!(i in next)) next[i] = true; });
      return next;
    });
  }

  function loadSamplePantry() {
    mergeItems(samplePantryFor(dietType));
  }

  function toggleAll(value: boolean) {
    const next: Record<string, boolean> = {};
    items.forEach(item => { next[item] = value; });
    setChecked(next);
  }

  async function pickReceipt(useCamera: boolean) {
    if (isParsingRef.current) return;

    // Show an app-authored rationale before the OS permission prompt, so the
    // user understands why we need access. Only shown when not already granted.
    const existing = useCamera
      ? await ImagePicker.getCameraPermissionsAsync()
      : await ImagePicker.getMediaLibraryPermissionsAsync();

    if (existing.status !== 'granted') {
      const proceed = await new Promise<boolean>(resolve => {
        Alert.alert(
          useCamera ? 'Camera access' : 'Photo access',
          useCamera
            ? 'We use your camera to photograph your grocery receipt. The image is sent to our AI only to read the ingredient list — that’s the one thing it’s used for.'
            : 'We use the photo you choose to read your grocery receipt. The image is sent to our AI only to extract the ingredient list — that’s the one thing it’s used for.',
          [
            { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continue', onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) return;
    }

    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to continue.');
      return;
    }

    const pickerOptions = { quality: 0.3 as const, base64: true, allowsEditing: false };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets[0]) return;

    isParsingRef.current = true;
    const { uri, width = 0, height = 0 } = result.assets[0];
    setReceiptUri(uri);

    setParsing(true);
    try {
      const maxDim = 1200;
      const converted = await ImageManipulator.manipulateAsync(
        uri,
        (width > maxDim || height > maxDim)
          ? [width >= height ? { resize: { width: maxDim } } : { resize: { height: maxDim } }]
          : [],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!converted.base64) {
        Alert.alert('Couldn’t read that photo', 'We couldn’t process that image. Try another photo, or add items by hand below.');
        return;
      }

      const parsed = await parseReceiptFromImage(converted.base64, 'image/jpeg');
      mergeItems(parsed);
    } catch (e: any) {
      if (e.message.startsWith('No internet') || e.message.startsWith('Request timed out')) {
        Alert.alert('Can’t reach the kitchen', e.message);
      } else {
        Alert.alert('Couldn’t read that receipt', 'The photo may be too blurry or dark. Try again in better light, or add items by hand below.');
      }
    } finally {
      setParsing(false);
      isParsingRef.current = false;
    }
  }

  function addManualItem() {
    const trimmed = newItem.trim().toLowerCase();
    if (trimmed && !items.includes(trimmed)) {
      setItems(prev => [...prev, trimmed]);
      setChecked(prev => ({ ...prev, [trimmed]: true }));
    }
    setNewItem('');
  }

  function removeItem(item: string) {
    setItems(prev => prev.filter(i => i !== item));
    setChecked(prev => { const n = { ...prev }; delete n[item]; return n; });
  }

  function handleStartOver() {
    setReceiptUri(null);
    setItems([]);
    setChecked({});
    setNewItem('');
    setShowManualAdd(false);
  }

  async function handleGenerate() {
    if (isGeneratingRef.current) return;
    const checkedItems = items.filter(i => checked[i]);
    if (checkedItems.length === 0 && pantryCount === 0) {
      Alert.alert('Add some ingredients first', 'Check at least one ingredient above, or add items to your pantry — we need something to cook with.');
      return;
    }

    isGeneratingRef.current = true;
    setGenerating(true);
    try {
      const pantryItems = await getPantryItems();
      const allIngredients = Array.from(new Set([...checkedItems, ...pantryItems]));
      const selectedMeals = MEAL_TYPES.filter(m => meals[m.id]).map(m => m.id);
      const mealsToUse = selectedMeals.length > 0 ? selectedMeals : (['dinner'] as MealType[]);
      const recipes = await generateMealPlan(allIngredients, dietType, glutenFree, mealsToUse, lowSalt, diabetic);

      // Fetch photos in small batches rather than all 7–21 at once. Bursting the
      // whole menu at Imagen trips its rate limit and leaves some cards stuck on
      // the placeholder; capped concurrency keeps the hit-rate high.
      const PHOTO_BATCH = 3;
      const withPhotos: typeof recipes = [];
      for (let i = 0; i < recipes.length; i += PHOTO_BATCH) {
        const slice = recipes.slice(i, i + PHOTO_BATCH);
        const settled = await Promise.allSettled(
          slice.map(async recipe => ({
            ...recipe,
            dietType,
            photoUrl: (await fetchFoodPhoto(recipe.searchQuery)) ?? undefined,
          }))
        );
        settled.forEach((result, j) => {
          withPhotos.push(
            result.status === 'fulfilled'
              ? result.value
              : { ...slice[j], dietType, photoUrl: undefined }
          );
        });
      }

      if (!isMountedRef.current) return;

      // Write to pantry only after generation succeeds so a failed call doesn't mutate pantry
      const toSave = checkedItems.filter(i => !pantryItems.includes(i));
      if (toSave.length > 0) await addPantryItems(toSave);
      await saveCurrentMealPlan(withPhotos, allIngredients, dietType);

      flowCompletedRef.current = true;
      navigation.navigate('MealPlan', {
        recipes: withPhotos,
        ingredients: allIngredients,
        dietType,
        glutenFree,
        lowSalt,
        diabetic,
        pantrySavedCount: toSave.length,
      });
    } catch (e: any) {
      if (e.message === RATE_LIMIT_ERROR) {
        startRetryCountdown(60);
        Alert.alert(
          'The kitchen’s backed up',
          'Too many cooks right now. Give it 60 seconds, then tap Generate to try again.'
        );
      } else if (e.message === AI_PARSE_ERROR) {
        Alert.alert(
          'Let’s try that again',
          'Something came back garbled — your ingredients are safe. Tap Generate to give it another go.'
        );
      } else if (e.message.startsWith('No internet') || e.message.startsWith('Request timed out')) {
        Alert.alert('Can’t reach the kitchen', e.message);
      } else {
        Alert.alert('Couldn’t build your menu', 'We hit a snag — your ingredients are safe. Tap Generate to try again.');
      }
    } finally {
      setGenerating(false);
      isGeneratingRef.current = false;
    }
  }

  const checkedCount = items.filter(i => checked[i]).length;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={item => item}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Scan Your Receipt</Text>
            <Text style={styles.subtitle}>
              Photograph your grocery receipt and we'll extract the ingredients automatically.
            </Text>

            {/* 3-step orientation: shown for first-time users only. Returning
                users (who've made a plan) get the decluttered screen instead. */}
            {!hasGeneratedBefore && (
              <View style={styles.miniSteps}>
                {[
                  ['📷', 'Scan receipt'],
                  ['🤖', 'AI builds 7 recipes'],
                  ['🍽', 'Eat well all week'],
                ].map(([icon, label], i, arr) => (
                  <React.Fragment key={label}>
                    <View style={styles.miniStep}>
                      <Text style={styles.miniStepIcon}>{icon}</Text>
                      <Text style={styles.miniStepLabel}>{label}</Text>
                    </View>
                    {i < arr.length - 1 && <Text style={styles.miniStepArrow}>›</Text>}
                  </React.Fragment>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.cameraBtn} onPress={() => pickReceipt(true)} activeOpacity={0.85}>
              <Text style={styles.cameraBtnIcon}>📷</Text>
              <Text style={styles.cameraBtnLabel}>Scan Receipt</Text>
            </TouchableOpacity>

            {/* Sample pantry is a first-run helper only — once the user has made a
                plan it just adds clutter, so hide it for returning users. */}
            {!hasGeneratedBefore && (
              <TouchableOpacity style={styles.sampleBtn} onPress={loadSamplePantry} activeOpacity={0.85}>
                <Text style={styles.sampleBtnText}>🥗  Start with a sample pantry →</Text>
              </TouchableOpacity>
            )}

            {/* Returning user with a stocked pantry can cook straight from it, no
                receipt. Tapping REVEALS the options (it does not generate) and
                stays visible in a selected state so the source is always clear;
                tapping again deselects. Generation only on the Generate button. */}
            {items.length === 0 && pantryCount > 0 && (
              <TouchableOpacity
                style={[
                  styles.pantryCookBtn,
                  { borderColor: dietConfig.color },
                  usePantry && { backgroundColor: dietConfig.accentColor },
                ]}
                onPress={() => setUsePantry(prev => !prev)}
                activeOpacity={0.85}
              >
                <Text style={[styles.pantryCookBtnText, { color: dietConfig.color }]}>
                  {usePantry
                    ? `✓  Cooking from My Pantry (${pantryCount} item${pantryCount !== 1 ? 's' : ''})`
                    : `🥫  Cook from My Pantry (${pantryCount} item${pantryCount !== 1 ? 's' : ''}) →`}
                </Text>
              </TouchableOpacity>
            )}

            {receiptUri && (
              <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
            )}

            {parsing && (
              <View style={styles.statusBox}>
                <ActivityIndicator color="#2e86ab" />
                <Text style={styles.statusText}>Reading receipt…</Text>
              </View>
            )}

            {items.length > 0 && (
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Your ingredients ({items.length})</Text>
                  <Text style={styles.pantryHint}>
                    Checked items go into your menu and are saved to your pantry.
                  </Text>
                </View>
                <View style={styles.toggleRow}>
                  <TouchableOpacity onPress={() => toggleAll(true)}>
                    <Text style={styles.toggleLink}>All</Text>
                  </TouchableOpacity>
                  <Text style={styles.toggleSep}>/</Text>
                  <TouchableOpacity onPress={() => toggleAll(false)}>
                    <Text style={styles.toggleLink}>None</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => setChecked(prev => ({ ...prev, [item]: !prev[item] }))}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, checked[item] && styles.checkboxChecked]}>
              {checked[item] && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.itemText}>{item}</Text>
            <TouchableOpacity onPress={() => removeItem(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.removeBtn}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <>
            {/* Manual add — collapsed by default; expands on tap. Stays as the
                OCR-miss recovery path and the no-scan typing route. */}
            <View style={styles.section}>
              {showManualAdd ? (
                <>
                  <Text style={styles.sectionTitle}>Add an item</Text>
                  <View style={styles.addRow}>
                    <TextInput
                      style={styles.input}
                      value={newItem}
                      onChangeText={setNewItem}
                      placeholder="e.g. canned chickpeas"
                      placeholderTextColor="#9bb4c2"
                      returnKeyType="done"
                      onSubmitEditing={addManualItem}
                      autoFocus
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={addManualItem}>
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.addToggle}
                  onPress={() => setShowManualAdd(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addToggleText}>＋  Add an item manually</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Meal selection + dietary options are revealed once there is
                anything to plan from — scanned/added items OR a stocked pantry.
                A genuine first-timer (empty pantry, nothing scanned) gets the
                clean screen; a returning user with a pantry keeps full control
                (and can still generate pantry-only, so the controls must show). */}
            {(items.length > 0 || usePantry) && (
              <>
                {/* Meal selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Which meals?</Text>
                  <Text style={styles.pantryHint}>
                    We’ll build 7 recipes — one per day — for each meal you pick.
                  </Text>
                  <View style={styles.mealChipRow}>
                    {MEAL_TYPES.map(m => {
                      const on = meals[m.id];
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            styles.mealChip,
                            on && { backgroundColor: dietConfig.accentColor, borderColor: dietConfig.color },
                          ]}
                          onPress={() => setMeals(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.mealChipEmoji}>{m.emoji}</Text>
                          <Text style={[styles.mealChipLabel, on && { color: dietConfig.color, fontWeight: '700' }]}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Dietary options — compact chips on a single horizontal row so
                    adding a third (Diabetic) keeps the screen to one view. */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dietary options</Text>
                  <View style={styles.dietChipRow}>
                    {([
                      ['Gluten-Free', glutenFree, () => setGlutenFree(prev => !prev)],
                      ['Low Salt', lowSalt, () => setLowSalt(prev => !prev)],
                      ['Diabetic', diabetic, () => setDiabetic(prev => !prev)],
                    ] as const).map(([label, on, toggle]) => (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.dietChip,
                          on && { backgroundColor: dietConfig.accentColor, borderColor: dietConfig.color },
                        ]}
                        onPress={toggle}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.dietChipLabel, on && { color: dietConfig.color, fontWeight: '700' }]}
                          numberOfLines={1}
                          allowFontScaling={false}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Start Over */}
            {items.length > 0 && (
              <TouchableOpacity style={styles.startOverBtn} onPress={handleStartOver} activeOpacity={0.75}>
                <Text style={styles.startOverText}>Start Over</Text>
              </TouchableOpacity>
            )}

            {/* Retry countdown */}
            {retryCountdown > 0 && (
              <View style={styles.countdownBox}>
                <ActivityIndicator color="#f4a261" size="small" />
                <Text style={styles.countdownText}>
                  Kitchen’s slammed — trying again in {retryCountdown}s
                </Text>
              </View>
            )}

            {generating && (
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(((generatingStep + 1) / GENERATING_STEPS.length) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>{GENERATING_STEPS[generatingStep]}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.generateBtn,
                { backgroundColor: dietConfig.color },
                (generating || (checkedCount === 0 && !usePantry) || retryCountdown > 0) && styles.btnDisabled,
              ]}
              onPress={handleGenerate}
              disabled={generating || (checkedCount === 0 && pantryCount === 0) || retryCountdown > 0}
              activeOpacity={0.85}
            >
              {generating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.generateBtnText}>
                  {checkedCount > 0
                    ? `Generate ${dietConfig.label} Menu (${checkedCount} items) →`
                    : `Generate ${dietConfig.label} Menu →`}
                </Text>
              )}
            </TouchableOpacity>

            {!generating && checkedCount === 0 && !usePantry && (
              <Text style={styles.generateHint}>
                {pantryCount > 0
                  ? 'Tap “Cook from My Pantry” above, scan a receipt, or add items'
                  : 'Scan a receipt or add items above to get started'}
              </Text>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  container: { padding: 24, paddingBottom: 24 },

  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#5b7a8c', lineHeight: 20, marginBottom: 14 },
  miniSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  miniStep: { alignItems: 'center', flex: 1 },
  miniStepIcon: { fontSize: 22, marginBottom: 4 },
  miniStepLabel: { fontSize: 11, color: '#3a5663', fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  miniStepArrow: { fontSize: 20, color: '#c2d3dd', fontWeight: '300', marginBottom: 14 },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2e86ab',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 10,
  },
  cameraBtnIcon: { fontSize: 24 },
  cameraBtnLabel: { color: 'white', fontSize: 17, fontWeight: '700' },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    resizeMode: 'contain',
    backgroundColor: '#eef4f8',
  },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  statusText: { color: '#2e86ab', fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  pantryHint: { fontSize: 12, color: '#5b7a8c', fontStyle: 'italic' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  toggleLink: { fontSize: 13, color: '#2e86ab', fontWeight: '600' },
  toggleSep: { fontSize: 13, color: '#9bb4c2' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c2d3dd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: { backgroundColor: '#2e86ab', borderColor: '#2e86ab' },
  checkmark: { color: 'white', fontSize: 13, fontWeight: '800' },
  itemText: { flex: 1, fontSize: 14, color: '#333', textTransform: 'capitalize' },
  removeBtn: { color: '#9bb4c2', fontWeight: '700', fontSize: 14 },

  section: { marginBottom: 14, marginTop: 4 },
  addToggle: { paddingVertical: 8, alignSelf: 'flex-start' },
  addToggleText: { color: '#2e86ab', fontSize: 15, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#dbe9f0',
  },
  addBtn: {
    backgroundColor: '#f4a261',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  mealChipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  mealChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#dbe9f0',
    gap: 4,
  },
  mealChipEmoji: { fontSize: 20 },
  mealChipLabel: { fontSize: 13, color: '#5b7a8c', fontWeight: '600' },

  dietChipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dietChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: '#dbe9f0',
  },
  dietChipLabel: { fontSize: 13, fontWeight: '600', color: '#5b7a8c' },

  pantryCookBtn: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 14,
  },
  pantryCookBtnText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },

  dietOptionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  dietOptionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#dbe9f0',
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#dbe9f0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: '#2e86ab' },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  dietOptionLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', flexShrink: 1 },
  dietOptionLabelOn: { color: '#2e86ab' },

  startOverBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  startOverText: { color: '#5b7a8c', fontSize: 14, textDecorationLine: 'underline' },

  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f4a261',
  },
  countdownText: { color: '#c07030', fontSize: 14, fontWeight: '600' },

  generateBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.5 },
  generateBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
  progressContainer: { marginTop: 4, marginBottom: 8 },
  progressTrack: {
    height: 6,
    backgroundColor: '#dbe9f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2e86ab',
    borderRadius: 3,
  },
  progressLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: '#2e86ab',
    fontWeight: '600',
    fontStyle: 'italic',
  },

  sampleBtn: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f4a261',
    marginBottom: 14,
  },
  sampleBtnText: { color: '#d97b34', fontSize: 15, fontWeight: '600' },
  generateHint: { textAlign: 'center', fontSize: 13, color: '#9bb4c2', marginTop: 6 },
});
