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
import { RootStackParamList } from '../types';
import {
  parseReceiptFromImage,
  generateMealPlan,
  RATE_LIMIT_ERROR,
  AI_PARSE_ERROR,
} from '../services/claudeService';
import { getPantryItems, addPantryItems } from '../services/pantryService';
import { fetchFoodPhoto } from '../services/unsplashService';
import { saveCurrentMealPlan } from '../services/currentMealPlanService';
import { DIET_TYPES } from '../constants/dietTypes';

const SAMPLE_PANTRY: string[] = [
  'chicken breast', 'olive oil', 'garlic', 'cherry tomatoes',
  'bell peppers', 'zucchini', 'lemon', 'pasta', 'canned chickpeas',
  'baby spinach', 'red onion', 'eggs', 'canned diced tomatoes',
];

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
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
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
        setGlutenFree(false);
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
    mergeItems(SAMPLE_PANTRY);
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
        Alert.alert('Could not read receipt', 'Image data unavailable.');
        return;
      }

      const parsed = await parseReceiptFromImage(converted.base64, 'image/jpeg');
      mergeItems(parsed);
    } catch (e: any) {
      if (e.message.startsWith('No internet') || e.message.startsWith('Request timed out')) {
        Alert.alert('No Connection', e.message);
      } else {
        Alert.alert('Could not read receipt', 'The receipt scan failed. Try again or add items manually.');
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
  }

  async function handleGenerate() {
    if (isGeneratingRef.current) return;
    const checkedItems = items.filter(i => checked[i]);
    if (checkedItems.length === 0 && pantryCount === 0) {
      Alert.alert('No ingredients selected', 'Check at least one ingredient or add items to your pantry to generate a meal plan.');
      return;
    }

    isGeneratingRef.current = true;
    setGenerating(true);
    try {
      const pantryItems = await getPantryItems();
      const allIngredients = Array.from(new Set([...checkedItems, ...pantryItems]));
      const recipes = await generateMealPlan(allIngredients, dietType, glutenFree);

      const settled = await Promise.allSettled(
        recipes.map(async recipe => ({
          ...recipe,
          dietType,
          photoUrl: (await fetchFoodPhoto(recipe.searchQuery)) ?? undefined,
        }))
      );
      const withPhotos = settled.map((result, i) =>
        result.status === 'fulfilled'
          ? result.value
          : { ...recipes[i], dietType, photoUrl: undefined }
      );

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
        pantrySavedCount: toSave.length,
      });
    } catch (e: any) {
      if (e.message === RATE_LIMIT_ERROR) {
        startRetryCountdown(60);
        Alert.alert(
          'Too Many Requests',
          'The AI service is busy. Please wait 60 seconds, then tap Generate to try again.'
        );
      } else if (e.message === AI_PARSE_ERROR) {
        Alert.alert(
          'Unexpected Response',
          'The AI returned something unexpected. Please tap "Generate" again to retry.'
        );
      } else if (e.message.startsWith('No internet') || e.message.startsWith('Request timed out')) {
        Alert.alert('No Connection', e.message);
      } else {
        Alert.alert('Generation failed', 'Something went wrong. Please try again.');
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
            {/* Diet type badge */}
            <View style={[styles.dietBadge, { backgroundColor: dietConfig.accentColor, borderColor: dietConfig.color }]}>
              <Text style={styles.dietBadgeEmoji}>{dietConfig.emoji}</Text>
              <Text style={[styles.dietBadgeLabel, { color: dietConfig.color }]}>{dietConfig.label} Plan</Text>
            </View>

            <Text style={styles.title}>Scan Your Receipt</Text>
            <Text style={styles.subtitle}>
              Photograph your grocery receipt and we'll extract the ingredients automatically.
            </Text>

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

            <TouchableOpacity style={styles.cameraBtn} onPress={() => pickReceipt(true)} activeOpacity={0.85}>
              <Text style={styles.cameraBtnIcon}>📷</Text>
              <Text style={styles.cameraBtnLabel}>Scan with Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.libraryBtn} onPress={() => pickReceipt(false)} activeOpacity={0.85}>
              <Text style={styles.libraryBtnLabel}>🖼  Choose from Photo Library</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sampleBtn} onPress={loadSamplePantry} activeOpacity={0.85}>
              <Text style={styles.sampleBtnText}>🥗  Start with a sample pantry →</Text>
            </TouchableOpacity>

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
                  <Text style={styles.sectionTitle}>Your Ingredients ({items.length})</Text>
                  <Text style={styles.pantryHint}>
                    Checked items are included in your meal plan and saved to your pantry.
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
            {/* Add item manually */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add item manually</Text>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.input}
                  value={newItem}
                  onChangeText={setNewItem}
                  placeholder="e.g. canned chickpeas"
                  placeholderTextColor="#bbb"
                  returnKeyType="done"
                  onSubmitEditing={addManualItem}
                />
                <TouchableOpacity style={styles.addBtn} onPress={addManualItem}>
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gluten-free toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dietary options</Text>
              <TouchableOpacity
                style={styles.glutenFreeRow}
                onPress={() => setGlutenFree(prev => !prev)}
                activeOpacity={0.7}
              >
                <View style={[styles.toggle, glutenFree && styles.toggleOn]}>
                  <View style={[styles.toggleThumb, glutenFree && styles.toggleThumbOn]} />
                </View>
                <View style={styles.glutenFreeText}>
                  <Text style={styles.glutenFreeLabel}>Gluten-Free</Text>
                  <Text style={styles.glutenFreeHint}>All recipes will avoid gluten-containing ingredients</Text>
                </View>
              </TouchableOpacity>
            </View>

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
                  AI service busy — retrying in {retryCountdown}s
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
                (generating || (checkedCount === 0 && pantryCount === 0) || retryCountdown > 0) && styles.btnDisabled,
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
                    ? `Generate ${dietConfig.label} Plan (${checkedCount} items) →`
                    : `Generate ${dietConfig.label} Plan →`}
                </Text>
              )}
            </TouchableOpacity>

            {!generating && checkedCount === 0 && pantryCount === 0 && (
              <Text style={styles.generateHint}>
                Scan a receipt or add items above to get started
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

  dietBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  dietBadgeEmoji: { fontSize: 18 },
  dietBadgeLabel: { fontSize: 14, fontWeight: '700' },

  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 14 },
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
  miniStepLabel: { fontSize: 11, color: '#555', fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  miniStepArrow: { fontSize: 20, color: '#ccc', fontWeight: '300', marginBottom: 14 },
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
  libraryBtn: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#a8dadc',
    marginBottom: 10,
  },
  libraryBtnLabel: { fontSize: 15, fontWeight: '600', color: '#2e86ab' },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    resizeMode: 'contain',
    backgroundColor: '#eee',
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
  pantryHint: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  toggleLink: { fontSize: 13, color: '#2e86ab', fontWeight: '600' },
  toggleSep: { fontSize: 13, color: '#bbb' },

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
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: { backgroundColor: '#2e86ab', borderColor: '#2e86ab' },
  checkmark: { color: 'white', fontSize: 13, fontWeight: '800' },
  itemText: { flex: 1, fontSize: 14, color: '#333', textTransform: 'capitalize' },
  removeBtn: { color: '#bbb', fontWeight: '700', fontSize: 14 },

  section: { marginBottom: 14, marginTop: 4 },
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
    borderColor: '#ddd',
  },
  addBtn: {
    backgroundColor: '#f4a261',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  glutenFreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    gap: 14,
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ddd',
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
  glutenFreeText: { flex: 1 },
  glutenFreeLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  glutenFreeHint: { fontSize: 12, color: '#888', marginTop: 2 },

  startOverBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  startOverText: { color: '#888', fontSize: 14, textDecorationLine: 'underline' },

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
    backgroundColor: '#e0e0e0',
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
  generateHint: { textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 6 },
});
