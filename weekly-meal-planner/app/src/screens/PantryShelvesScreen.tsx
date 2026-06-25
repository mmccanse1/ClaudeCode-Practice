import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  getCategorizedPantry,
  removePantryItem,
  getPantryPhotoCache,
  removePantryPhoto,
  setPantryPhoto,
  CategorizedPantry,
  PantrySection,
} from '../services/pantryService';
import { fetchIngredientPhoto } from '../services/unsplashService';

type Props = NativeStackScreenProps<RootStackParamList, 'PantryShelf'>;

const { width: SCREEN_W } = Dimensions.get('window');
const ITEMS_PER_ROW = 4;
const H_PAD = 16;
const GAP = 6;
const TILE_W = Math.floor((SCREEN_W - H_PAD * 2 - GAP * (ITEMS_PER_ROW - 1)) / ITEMS_PER_ROW);
const IMG_SIZE = TILE_W - 8;

const SECTION_CONFIG: Record<PantrySection, { label: string; emoji: string; color: string; bg: string }> = {
  refrigerated: { label: 'Refrigerated', emoji: '❄️', color: '#1d6a87', bg: '#e3f3f8' },
  spices:       { label: 'Spices & Seasonings', emoji: '🌿', color: '#5c4a1a', bg: '#faf0e6' },
  dry_goods:    { label: 'Dry Goods', emoji: '🥫', color: '#7B4A1E', bg: '#f9ead8' },
};

const SECTION_ORDER: PantrySection[] = ['refrigerated', 'spices', 'dry_goods'];

export default function PantryShelvesScreen({}: Props) {
  const [pantry, setPantry] = useState<CategorizedPantry>({ refrigerated: [], spices: [], dry_goods: [] });
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getCategorizedPantry(), getPantryPhotoCache()]).then(([cat, cache]) => {
        setPantry(cat);
        setPhotos(cache);
        setLoading(false);
      });
    }, [])
  );

  const allItems = [
    ...pantry.refrigerated,
    ...pantry.spices,
    ...pantry.dry_goods,
  ];

  useEffect(() => {
    allItems.forEach(item => {
      if (!photos[item]) {
        fetchIngredientPhoto(item).then(url => {
          if (url) {
            setPhotos(prev => ({ ...prev, [item]: url }));
            setPantryPhoto(item, url);
          }
        });
      }
    });
  }, [pantry]);

  async function handleRemove(item: string) {
    Alert.alert('Remove item', `Remove "${item}" from pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = await removePantryItem(item);
          await removePantryPhoto(item);
          setPhotos(prev => { const n = { ...prev }; delete n[item]; return n; });
          // Re-fetch categorized pantry to update display
          const cat = await getCategorizedPantry();
          setPantry(cat);
        },
      },
    ]);
  }

  function renderGrid(items: string[]) {
    const rows: string[][] = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_ROW) {
      rows.push(items.slice(i, i + ITEMS_PER_ROW));
    }
    return rows.map((row, ri) => (
      <View key={ri} style={styles.tileRow}>
        {row.map(item => (
          <View key={item} style={[styles.tile, { width: TILE_W }]}>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(item)}
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
            {photos[item] ? (
              <Image
                source={{ uri: photos[item] }}
                style={[styles.tileImg, { width: IMG_SIZE, height: IMG_SIZE }]}
                onError={() => setPhotos(prev => { const n = { ...prev }; delete n[item]; return n; })}
              />
            ) : (
              <View style={[styles.tilePlaceholder, { width: IMG_SIZE, height: IMG_SIZE }]}>
                <Text style={styles.placeholderEmoji}>🥘</Text>
              </View>
            )}
            <Text style={styles.tileLabel} numberOfLines={1}>{item}</Text>
          </View>
        ))}
      </View>
    ));
  }

  const totalItems = allItems.length;

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <ActivityIndicator color="#2e86ab" size="large" style={styles.spinner} />
      ) : totalItems === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Your pantry is empty</Text>
          <Text style={styles.emptyText}>
            Add ingredients on the My Pantry page — items will be automatically sorted into sections.
          </Text>
        </View>
      ) : (
        /* ── Sectioned view: 3 labeled sections for all users ── */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {SECTION_ORDER.map(section => {
            const items = pantry[section];
            const cfg = SECTION_CONFIG[section];
            return (
              <View key={section} style={styles.section}>
                <View style={[styles.sectionHeader, { backgroundColor: cfg.bg, borderLeftColor: cfg.color }]}>
                  <Text style={styles.sectionEmoji}>{cfg.emoji}</Text>
                  <View style={styles.sectionHeaderText}>
                    <Text style={[styles.sectionLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.sectionCount}>
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                </View>
                {items.length === 0 ? (
                  <View style={styles.emptySectionRow}>
                    <Text style={styles.emptySectionText}>Nothing here yet</Text>
                  </View>
                ) : (
                  <View style={styles.gridWrap}>{renderGrid(items)}</View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  spinner: { flex: 1 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },

  scrollContent: { padding: H_PAD, paddingBottom: 40 },

  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderLeftWidth: 4,
    gap: 12,
  },
  sectionEmoji: { fontSize: 22 },
  sectionHeaderText: { flex: 1 },
  sectionLabel: { fontSize: 15, fontWeight: '800' },
  sectionCount: { fontSize: 12, color: '#999', marginTop: 1 },

  emptySectionRow: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  emptySectionText: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },

  gridWrap: { padding: 10, paddingTop: 4 },

  tileRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: 10,
  },
  tile: { alignItems: 'center', position: 'relative' },
  tileImg: {
    borderRadius: 8,
    resizeMode: 'cover',
    backgroundColor: '#f0ede7',
  },
  tilePlaceholder: {
    borderRadius: 8,
    backgroundColor: '#ede8e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 24 },
  tileLabel: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: 'white', fontSize: 8, fontWeight: '800' },

});
