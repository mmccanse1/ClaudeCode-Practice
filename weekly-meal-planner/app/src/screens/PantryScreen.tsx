import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  getPantryItems,
  addPantryItem,
  removePantryItem,
  clearPantry,
} from '../services/pantryService';
import PantryItemRow from '../components/PantryItemRow';

type Props = NativeStackScreenProps<RootStackParamList, 'Pantry'>;

export default function PantryScreen({ navigation }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getPantryItems().then(i => {
        setItems(i);
        setLoading(false);
      });
    }, [])
  );

  async function handleAdd() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    const updated = await addPantryItem(trimmed);
    setItems(updated);
    setNewItem('');
  }

  async function handleRemove(item: string) {
    const updated = await removePantryItem(item);
    setItems(updated);
  }

  function handleClear() {
    Alert.alert(
      'Clear pantry?',
      'This will remove all pantry items permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: async () => {
            await clearPantry();
            setItems([]);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Pantry</Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearBtn}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>
          Items here are automatically included in every meal plan you generate.
          They persist between sessions.
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

        {loading ? (
          <ActivityIndicator color="#2e86ab" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗄</Text>
            <Text style={styles.emptyTitle}>Pantry is empty</Text>
            <Text style={styles.emptySubtitle}>
              Add staples like olive oil, garlic, canned tomatoes, or dried pasta
              so they're always considered in your meal plans.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <PantryItemRow item={item} onRemove={handleRemove} />
            )}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  container: { flex: 1, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  clearBtn: { fontSize: 14, color: '#e05c5c', fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#777', lineHeight: 19, marginBottom: 20 },
  addRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
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
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: '#777', textAlign: 'center', lineHeight: 21 },
});
