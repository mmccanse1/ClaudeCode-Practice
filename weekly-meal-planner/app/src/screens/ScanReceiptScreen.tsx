import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { parseReceiptFromImage } from '../services/claudeService';
import { getPantryItems, addPantryItems } from '../services/pantryService';
import { generateMealPlan } from '../services/claudeService';
import { fetchFoodPhoto } from '../services/unsplashService';
import { saveCurrentMealPlan } from '../services/currentMealPlanService';
import { DIET_TYPES } from '../constants/dietTypes';
import { IS_PREMIUM } from '../constants/subscription';
import { DietType } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanReceipt'>;

export default function ScanReceiptScreen({ navigation }: Props) {
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<string[]>([]);
  const [pantryChecked, setPantryChecked] = useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = useState('');
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<DietType>('mediterranean');
  const [pantryCount, setPantryCount] = useState(0);

  useEffect(() => {
    getPantryItems().then(items => setPantryCount(items.length));
  }, []);

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
      const recipes = await generateMealPlan(allIngredients, selectedDiet);

      // Fetch photos in parallel and stamp dietType on every recipe
      const withPhotos = await Promise.all(
        recipes.map(async recipe => ({
          ...recipe,
          dietType: selectedDiet,
          photoUrl: (await fetchFoodPhoto(recipe.searchQuery)) ?? undefined,
        }))
      );

      await saveCurrentMealPlan(withPhotos, allIngredients, selectedDiet);

      navigation.navigate('MealPlan', {
        recipes: withPhotos,
        ingredients: allIngredients,
        dietType: selectedDiet,
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diet Type</Text>
          {DIET_TYPES.map(diet => {
            const locked = diet.isPremium && !IS_PREMIUM;
            const selected = selectedDiet === diet.id;
            return (
              <TouchableOpacity
                key={diet.id}
                style={[styles.dietRow, selected && styles.dietRowSelected, locked && styles.dietRowLocked]}
                onPress={() => { if (!locked) setSelectedDiet(diet.id); }}
                activeOpacity={locked ? 1 : 0.7}
              >
                <Text style={styles.dietEmoji}>{diet.emoji}</Text>
                <View style={styles.dietInfo}>
                  <Text style={[styles.dietLabel, selected && styles.dietLabelSelected, locked && styles.dietLabelLocked]}>
                    {diet.label}
                  </Text>
                  <Text style={styles.dietDesc}>{diet.description}</Text>
                </View>
                {locked ? (
                  <Text style={styles.lockIcon}>🔒</Text>
                ) : selected ? (
                  <Text style={styles.checkIcon}>✓</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.generateBtn, (generating || (receiptItems.length === 0 && pantryCount === 0)) && styles.btnDisabled]}
          onPress={handleGenerate}
          disabled={generating || (receiptItems.length === 0 && pantryCount === 0)}
          activeOpacity={0.85}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateBtnText}>Generate Week of Recipes →</Text>
          )}
        </TouchableOpacity>

        {generating && (
          <Text style={styles.generatingNote}>
            Creating your {DIET_TYPES.find(d => d.id === selectedDiet)?.label ?? 'meal'} plan… this may take 15–30 seconds.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  container: { padding: 24 },
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
  generateBtn: {
    backgroundColor: '#2e86ab',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.5 },
  generateBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
  generatingNote: { textAlign: 'center', fontSize: 13, color: '#888', fontStyle: 'italic' },

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

  dietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  dietRowSelected: { borderColor: '#2e86ab', backgroundColor: '#f0f8fb' },
  dietRowLocked: { opacity: 0.5 },
  dietEmoji: { fontSize: 22 },
  dietInfo: { flex: 1 },
  dietLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  dietLabelSelected: { color: '#2e86ab' },
  dietLabelLocked: { color: '#999' },
  dietDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  lockIcon: { fontSize: 16 },
  checkIcon: { fontSize: 16, color: '#2e86ab', fontWeight: '800' },
});
