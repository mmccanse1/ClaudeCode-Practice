import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getPantryItems, addPantryItem, clearPantry, setPantryPhoto } from '../services/pantryService';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Pantry'>;

const PANTRY_BG = require('../../assets/pantry-bg.png');

const { width: SCREEN_W } = Dimensions.get('window');

export default function PantryScreen({ navigation }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getPantryItems().then(setItems);
    }, [])
  );

  async function handleAdd() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    const updated = await addPantryItem(trimmed);
    setItems(updated);
    setNewItem('');
  }

  async function handleScanAdd(itemName: string, photoUrl?: string) {
    const updated = await addPantryItem(itemName);
    setItems(updated);
    if (photoUrl) await setPantryPhoto(itemName, photoUrl);
  }

  function handleClear() {
    Alert.alert('Clear pantry?', 'This will remove all pantry items permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          await clearPantry();
          setItems([]);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Pantry</Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearBtn}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.instructions}>
          {[
            ['✏️', 'Type an item and tap + Add'],
            ['📦', 'Scan a barcode to add a product'],
            ['🧾', 'Items from your receipt are saved here automatically'],
          ].map(([icon, tip]) => (
            <View key={tip} style={styles.instructionRow}>
              <Text style={styles.instructionIcon}>{icon}</Text>
              <Text style={styles.instructionText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={newItem}
            onChangeText={setNewItem}
            placeholder="e.g. canned tomatoes"
            placeholderTextColor="#9bb4c2"
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerVisible(true)}>
            <View style={styles.barcodeIcon}>
              {[2, 1, 3, 1, 2, 1, 3, 1, 2].map((w, i) => (
                <View key={i} style={[styles.bar, { width: w }]} />
              ))}
            </View>
          </TouchableOpacity>
        </View>

        <BarcodeScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onAdd={handleScanAdd}
        />

        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => navigation.navigate('PantryShelf')}
          activeOpacity={0.82}
        >
          <Text style={styles.openBtnText}>
            {'🚪  Open Pantry' + (items.length > 0 ? `  (${items.length} items)` : '')}
          </Text>
        </TouchableOpacity>

        <Image
          source={PANTRY_BG}
          style={styles.pantryImage}
          resizeMode="cover"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  container: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 0 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  clearBtn: { fontSize: 14, color: '#e05c5c', fontWeight: '600' },

  instructions: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#eef4f8',
  },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  instructionIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  instructionText: { fontSize: 13, color: '#3a5663', flex: 1, lineHeight: 18 },

  addRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
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
    backgroundColor: '#2e86ab',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  scanBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#1d5c63',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    gap: 2,
  },
  bar: {
    height: '100%',
    backgroundColor: 'white',
  },

  openBtn: {
    backgroundColor: '#7B4A1E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  openBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Bounded, rounded illustration rather than a full-bleed image taller than the
  // screen. Explicit numeric width (screen minus the container's 20px padding
  // each side) — a percentage width can collapse an Image to zero in a ScrollView.
  pantryImage: {
    width: SCREEN_W - 40,
    height: Math.round((SCREEN_W - 40) * 0.62),
    borderRadius: 14,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
});
