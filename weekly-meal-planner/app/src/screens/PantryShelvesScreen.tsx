import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getPantryItems, removePantryItem, getPantryPhotoCache, removePantryPhoto } from '../services/pantryService';
import { fetchIngredientPhoto } from '../services/unsplashService';

type Props = NativeStackScreenProps<RootStackParamList, 'PantryShelf'>;

const SHELF_IMG_URL = 'https://m.media-amazon.com/images/I/712qI3GDqjL._AC_SX679_.jpg';
const { width: SCREEN_W } = Dimensions.get('window');
const ITEMS_PER_ROW = 4;
const H_PAD = 16;
const GAP = 6;
const TILE_W = Math.floor((SCREEN_W - H_PAD * 2 - GAP * (ITEMS_PER_ROW - 1)) / ITEMS_PER_ROW);
const IMG_SIZE = TILE_W - 8;

export default function PantryShelvesScreen({}: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getPantryItems(), getPantryPhotoCache()]).then(([i, cache]) => {
        setItems(i);
        setPhotos(cache);
        setLoading(false);
      });
    }, [])
  );

  useEffect(() => {
    items.forEach(item => {
      if (!photos[item]) {
        fetchIngredientPhoto(item).then(url => {
          if (url) setPhotos(prev => ({ ...prev, [item]: url }));
        });
      }
    });
  }, [items]);

  async function handleRemove(item: string) {
    Alert.alert('Remove item', `Remove "${item}" from pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = await removePantryItem(item);
          await removePantryPhoto(item);
          setItems(updated);
          setPhotos(prev => { const n = { ...prev }; delete n[item]; return n; });
        },
      },
    ]);
  }

  const rows: string[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_ROW) {
    rows.push(items.slice(i, i + ITEMS_PER_ROW));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={{ uri: SHELF_IMG_URL }} style={styles.bg} resizeMode="cover">
        <View style={styles.overlay} />
        {loading ? (
          <ActivityIndicator color="white" size="large" style={styles.spinner} />
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              No items yet — add ingredients on the My Pantry page.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {rows.map((row, ri) => (
              <View key={ri} style={styles.shelfRow}>
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
            ))}
          </ScrollView>
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  spinner: { flex: 1 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    textAlign: 'center',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 24,
    paddingBottom: 40,
  },
  shelfRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: 34,
  },
  tile: {
    alignItems: 'center',
    position: 'relative',
  },
  tileImg: {
    borderRadius: 6,
    resizeMode: 'cover',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tilePlaceholder: {
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 26 },
  tileLabel: {
    fontSize: 9,
    color: 'white',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'capitalize',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: 'white', fontSize: 8, fontWeight: '800' },
});
