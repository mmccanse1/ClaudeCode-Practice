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
  'Reading your ingredients…',
  'Choosing your Monday recipe…',
  'Planning the rest of your week…',
  'Adding nutrition notes…',
  'Almost there…',
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
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getPantryItems().then(pantryItems => setPantryCount(pantryItems.length));
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
      }, 5000);
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
    setItems(prev => [...new Set([...prev, ...deduped])]);
    setChecked(prev => {
      const next = { ...prev };
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

    const { uri } = result.assets[0];
    setReceiptUri(uri);

    setParsing(true);
    try {
      const converted = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!converted.base64) {
        Alert.alert('Could not read receipt', 'Image data unavailable.');
        return;
      }

      const parsed = await parseReceiptFromImage(converted.base64, 'image/jpeg');
      mergeItems(parsed);
    } catch (e: any) {
      if (e.message.startsWith('No internet')) {
        Alert.alert('No Connection', e.message);
      } else {
        Alert.alert('Could not read receipt', 'The receipt scan failed. Try again or add items manually.');
      }
    } finally {
      setParsing(false);
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
    const checkedItems = items.filter(i => checked[i]);
    if (checkedItems.length === 0 && pantryCount === 0) {
      Alert.alert('No ingredients selected', 'Check at least one ingredient or add items to your pantry to generate a meal plan.');
      return;
    }

    setGenerating(true);
    try {
      const pantryItems = await getPantryItems();
      const allIngredients = Array.from(new Set([...checkedItems, ...pantryItems]));
      const recipes = await generateMealPlan(allIngredients, dietType, glutenFree);

      const withPhotos = await Promise.all(
        recipes.map(async recipe => ({
          ...recipe,
          dietType,
          photoUrl: (await fetchFoodPhoto(recipe.searchQuery)) ?? undefined,
        }))
      );

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
      } else if (e.message.startsWith('No internet')) {
        Alert.alert('No Connection', e.message);
      } else {
        Alert.alert('Generation failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setGenerating(false);
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

            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={() => pickReceipt(true)} activeOpacity={0.85}>
                <Text style={styles.pickIcon}>📷</Text>
                <Text style={styles.pickLabel}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickBtn} onPress={() => pickReceipt(false)} activeOpacity={0.85}>
                <Text style={styles.pickIcon}>🖼</Text>
                <Text style={styles.pickLabel}>Photo Library</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sampleBtn} onPress={loadSamplePantry}>
              <Text style={styles.sampleBtnText}>No receipt? Try a sample pantry →</Text>
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
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  container: { padding: 24, paddingBottom: 40 },

  dietBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  dietBadgeEmoji: { fontSize: 18 },
  dietBadgeLabel: { fontSize: 14, fontWeight: '700' },

  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 24 },
  miniSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 4,
  },
  miniStep: { alignItems: 'center', flex: 1 },
  miniStepIcon: { fontSize: 22, marginBottom: 4 },
  miniStepLabel: { fontSize: 11, color: '#555', fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  miniStepArrow: { fontSize: 20, color: '#ccc', fontWeight: '300', marginBottom: 14 },
  pickRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickBtn: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#a8dadc',
  },
  pickIcon: { fontSize: 32, marginBottom: 6 },
  pickLabel: { fontSize: 13, fontWeight: '600', color: '#2e86ab' },
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

  section: { marginBottom: 24, marginTop: 8 },
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
    paddingVertical: 16,
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

  sampleBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  sampleBtnText: { color: '#2e86ab', fontSize: 14, fontWeight: '600' },
  generateHint: { textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 6 },
});
