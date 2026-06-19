import React, { useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { parseReceiptFromImage } from '../services/claudeService';
import { getPantryItems } from '../services/pantryService';
import { generateMealPlan } from '../services/claudeService';
import { fetchFoodPhoto } from '../services/unsplashService';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanReceipt'>;

export default function ScanReceiptScreen({ navigation }: Props) {
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function pickReceipt(useCamera: boolean) {
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to continue.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: true });

    if (result.canceled || !result.assets[0]) return;

    const { uri, base64, mimeType } = result.assets[0];
    setReceiptUri(uri);
    setReceiptItems([]);

    if (!base64) {
      Alert.alert('Could not read receipt', 'Image data unavailable.');
      return;
    }

    setParsing(true);
    try {
      const items = await parseReceiptFromImage(base64, mimeType || 'image/jpeg');
      setReceiptItems(items);
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
    }
    setNewItem('');
  }

  function removeItem(item: string) {
    setReceiptItems(prev => prev.filter(i => i !== item));
  }

  async function handleGenerate() {
    if (receiptItems.length === 0) {
      Alert.alert('No ingredients', 'Please scan a receipt or add items manually.');
      return;
    }

    setGenerating(true);
    try {
      const pantryItems = await getPantryItems();
      const allIngredients = Array.from(new Set([...receiptItems, ...pantryItems]));
      const recipes = await generateMealPlan(allIngredients);

      // Fetch Unsplash photos in parallel
      const withPhotos = await Promise.all(
        recipes.map(async recipe => ({
          ...recipe,
          photoUrl: (await fetchFoodPhoto(recipe.searchQuery)) ?? undefined,
        }))
      );

      navigation.navigate('MealPlan', {
        recipes: withPhotos,
        ingredients: allIngredients,
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
            <Text style={styles.sectionTitle}>
              Ingredients from receipt ({receiptItems.length})
            </Text>
            {receiptItems.map(item => (
              <View key={item} style={styles.itemRow}>
                <Text style={styles.itemText}>• {item}</Text>
                <TouchableOpacity onPress={() => removeItem(item)}>
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

        <TouchableOpacity
          style={[styles.generateBtn, (generating || receiptItems.length === 0) && styles.btnDisabled]}
          onPress={handleGenerate}
          disabled={generating || receiptItems.length === 0}
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
            Creating your Mediterranean meal plan… this may take 15–30 seconds.
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
});
