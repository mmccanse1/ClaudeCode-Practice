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
import { getPantryItems, addPantryItem, clearPantry } from '../services/pantryService';

type Props = NativeStackScreenProps<RootStackParamList, 'Pantry'>;

const PANTRY_BG_URL =
  'https://i.pinimg.com/736x/b0/9c/60/b09c60768a8fcfd18b77345234355d4f--kitchen-pantry-design-kitchen-pantry-cabinets.jpg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function PantryScreen({ navigation }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

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
        <Text style={styles.subtitle}>
          Items here are added to every meal plan you generate.
        </Text>

        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={newItem}
            onChangeText={setNewItem}
            placeholder="e.g. canned tomatoes"
            placeholderTextColor="#bbb"
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

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
          source={{ uri: PANTRY_BG_URL }}
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
  subtitle: { fontSize: 13, color: '#777', lineHeight: 19, marginBottom: 16 },

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
    borderColor: '#ddd',
  },
  addBtn: {
    backgroundColor: '#2e86ab',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

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

  pantryImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.62,
    marginLeft: -20,
  },
});
