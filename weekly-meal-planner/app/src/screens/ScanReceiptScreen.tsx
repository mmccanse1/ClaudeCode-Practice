import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { parseReceiptFromImage, generateMealPlan } from '../services/claudeService';
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

export default function ScanReceiptScreen({ navigation, route }: Props) {
  const { dietType } = route.params;
  const dietConfig = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0];

  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<string[]>([]);
  const [pantryChecked, setPantryChecked] = useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = useState('');
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [pantryCount, setPantryCount] = useState(0);
  const [progressStep, setProgressStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const PROGRESS_STEPS = [
    'Analyzing your ingredients…',
    `Building your ${dietConfig.label} menu…`,
    'Finding balanced recipes…',
    'Almost ready…',
  ];

  useEffect(() => {
    getPantryItems().then(items => setPantryCount(items.length));
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

  function loadSamplePantry() {
    const initialChecked: Record<string, boolean> = {};
    SAMPLE_PANTRY.forEach(item => { initialChecked[item] = true; });
    setReceiptItems(SAMPLE_PANTRY);
    setPantryChecked(initialChecked);
  }

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    receiptItems.forEach(item => { next[item] = checked; });
    setPantryChecked(next);
  }

  async function pickReceipt(useCamera: boolean) {
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to continue.');
      return;
    }

    const pickerOptions = {
      quality: 0.3,
      base64: true,
      allowsEditing: false,
    };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets[0]) return;

    const { uri } = result.assets[0];
    setReceiptUri(uri);
    setReceiptItems([]);
    setPantryChecked({});

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

      const items = await parseReceiptFromImage(converted.base64, 'image/jpeg');
      const initialChecked: Record<string, boolean> = {};
      items.forEach(i => { initialChecked[i] = true; });
      setReceiptItems(items);
      setPantryChecked(initialChecked);
    } catch (e: any) {
      Alert.alert('Could not read receipt', e.message);
    } finally {
      setParsing(false);
    }
  }

  function addManualItem() {
    const trimmed = newItem.trim().toLowerCase();
    if (trimmed && !receiptItems.includes(trimmed)) {
      setReceiptItems(prev => [...prev, trimmed]);
      setPantryChecked(prev => ({ ...prev, [trimmed]: true }));
    }
    setNewItem('');
  }

  function removeItem(item: string) {
    setReceiptItems(prev => prev.filter(i => i !== item));
    setPantryChecked(prev => { const n = { ...prev }; delete n[item]; return n; });
  }

  async function handleGenerate() {
    if (receiptItems.length === 0 && pantryCount === 0) {
      Alert.alert('No ingredients', 'Please scan a receipt, add items manually, or add items to your pantry.');
      return;
    }

    setGenerating(true);
    try {
      const toSave = receiptItems.filter(i => pantryChecked[i]);
      if (toSave.length > 0) await addPantryItems(toSave);

      const pantryItems = await getPantryItems();
      const allIngredients = Array.from(new Set([...receiptItems, ...pantryItems]));
      const recipes = await generateMealPlan(allIngredients, dietType, glutenFree);

      const withPhotos = await Promise.all(
        recipes.map(async recipe => ({
          ...recipe,
          dietType,
          photoUrl: (await fetchFoodPhoto(recipe.searchQuery)) ?? undefined,
        }))
      );

      await saveCurrentMealPlan(withPhotos, allIngredients, dietType);

      navigation.navigate('MealPlan', {
        recipes: withPhotos,
        ingredients: allIngredients,
        dietType,
        pantrySavedCount: toSave.length,
      });
    } catch (e: any) {
      Alert.alert('Generation failed', e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Diet type badge */}
        <View style={[styles.dietBadge, { backgroundColor: dietConfig.accentColor, borderColor: dietConfig.color }]}>
          <Text style={styles.dietBadgeEmoji}>{dietConfig.emoji}</Text>
          <Text style={[styles.dietBadgeLabel, { color: dietConfig.color }]}>{dietConfig.label} Plan</Text>
        </View>

        <Text style={styles.title}>Scan Your Receipt</Text>
        <Text style={styles.subtitle}>
          Photograph your grocery receipt and we'll extract the ingredients automatically.
        </Text>

        <View style={styles.pickRow}>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => pickReceipt(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.pickIcon}>📷</Text>
            <Text style={styles.pickLabel}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => pickReceipt(false)}
            activeOpacity={0.85}
          >
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

        {receiptItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.pantryHeader}>
              <Text style={styles.sectionTitle}>
                Ingredients ({receiptItems.length})
              </Text>
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
            <Text style={styles.pantryHint}>
              Check items to save to your pantry. Tap ✕ to remove from this plan.
            </Text>
            {receiptItems.map(item => (
              <View key={item} style={styles.checkRow}>
                <TouchableOpacity
                  style={styles.checkRowInner}
                  onPress={() => setPantryChecked(prev => ({ ...prev, [item]: !prev[item] }))}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, pantryChecked[item] && styles.checkboxChecked]}>
                    {pantryChecked[item] && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkLabel}>{item}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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

        <TouchableOpacity
          style={[
            styles.generateBtn,
            { backgroundColor: dietConfig.color },
            (generating || (receiptItems.length === 0 && pantryCount === 0)) && styles.btnDisabled,
          ]}
          onPress={handleGenerate}
          disabled={generating || (receiptItems.length === 0 && pantryCount === 0)}
          activeOpacity={0.85}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateBtnText}>
              Generate {dietConfig.label} Plan →
            </Text>
          )}
        </TouchableOpacity>

        {generating && (
          <Animated.Text style={[styles.generatingNote, { opacity: fadeAnim }]}>
            {PROGRESS_STEPS[progressStep]}
          </Animated.Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  container: { padding: 24 },

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
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  itemText: { flex: 1, fontSize: 14, color: '#333', textTransform: 'capitalize' },
  removeBtn: { color: '#bbb', fontWeight: '700', fontSize: 14 },
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

  generateBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.5 },
  generateBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
  generatingNote: { textAlign: 'center', fontSize: 13, color: '#888', fontStyle: 'italic' },

  sampleBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  sampleBtnText: { color: '#2e86ab', fontSize: 14, fontWeight: '600' },

  pantryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleLink: { fontSize: 13, color: '#2e86ab', fontWeight: '600' },
  toggleSep: { fontSize: 13, color: '#bbb' },
  pantryHint: { fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 10 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    gap: 12,
  },
  checkRowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  checkboxChecked: {
    backgroundColor: '#2e86ab',
    borderColor: '#2e86ab',
  },
  checkmark: { color: 'white', fontSize: 13, fontWeight: '800' },
  checkLabel: { flex: 1, fontSize: 14, color: '#333', textTransform: 'capitalize' },

});
