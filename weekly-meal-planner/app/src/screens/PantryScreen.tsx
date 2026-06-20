import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  Image,
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
import { fetchIngredientPhoto } from '../services/unsplashService';

type Props = NativeStackScreenProps<RootStackParamList, 'Pantry'>;

const { width: SCREEN_W } = Dimensions.get('window');
const CUPBOARD_W = SCREEN_W - 40;
const FRAME = 12;
const INTERIOR_W = CUPBOARD_W - FRAME * 2;
const DOOR_W = INTERIOR_W / 2;
const ITEMS_PER_ROW = 4;
const TILE = Math.floor((INTERIOR_W - 16) / ITEMS_PER_ROW);
const SHELF_H = TILE + 28;

export default function PantryScreen({ navigation }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const doorAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      getPantryItems().then(i => {
        setItems(i);
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

  function toggleDoors() {
    const next = !doorsOpen;
    Animated.spring(doorAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      tension: 55,
      friction: 9,
    }).start();
    setDoorsOpen(next);
  }

  async function handleAdd() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    const updated = await addPantryItem(trimmed);
    setItems(updated);
    setNewItem('');
  }

  async function handleRemove(item: string) {
    Alert.alert('Remove item', `Remove "${item}" from pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = await removePantryItem(item);
          setItems(updated);
        },
      },
    ]);
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

  const leftRotate = doorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-78deg'],
  });

  const rightRotate = doorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '78deg'],
  });

  const rows: string[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_ROW) {
    rows.push(items.slice(i, i + ITEMS_PER_ROW));
  }
  while (rows.length < 2) rows.push([]);

  const interiorH = rows.length * (SHELF_H + 8) + 10;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
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

        <TouchableOpacity style={styles.toggleBtn} onPress={toggleDoors} activeOpacity={0.82}>
          <Text style={styles.toggleBtnText}>
            {doorsOpen ? '🔒  Close Pantry' : '🚪  Open Pantry'}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color="#2e86ab" style={{ marginTop: 40 }} />
        ) : (
          <View style={[styles.cupboardFrame, { height: interiorH + FRAME * 2 }]}>

            {/* Interior shelves */}
            <View style={[styles.interior, { height: interiorH }]}>

              {items.length === 0 && (
                <View style={styles.emptyHint}>
                  <Text style={styles.emptyHintText}>
                    Add ingredients above to fill your pantry
                  </Text>
                </View>
              )}

              {rows.map((row, ri) => (
                <View key={ri} style={styles.shelfUnit}>
                  <View style={styles.shelfItems}>
                    {row.map(item => (
                      <View key={item} style={styles.tile}>
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => handleRemove(item)}
                          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                        >
                          <Text style={styles.removeBtnText}>✕</Text>
                        </TouchableOpacity>
                        {photos[item] ? (
                          <Image source={{ uri: photos[item] }} style={styles.tileImg} />
                        ) : (
                          <View style={styles.tileImgPlaceholder}>
                            <Text style={styles.tilePlaceholderEmoji}>🥘</Text>
                          </View>
                        )}
                        <Text style={styles.tileLabel} numberOfLines={1}>{item}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.shelfPlank} />
                </View>
              ))}

              {/* Left door */}
              <Animated.View
                pointerEvents={doorsOpen ? 'none' : 'auto'}
                style={[
                  styles.door,
                  styles.leftDoor,
                  {
                    height: interiorH,
                    transform: [
                      { perspective: 1200 },
                      { translateX: DOOR_W / 2 },
                      { rotateY: leftRotate },
                      { translateX: -(DOOR_W / 2) },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  onPress={toggleDoors}
                  activeOpacity={0.9}
                >
                  <View style={styles.doorPanelTop} />
                  <View style={styles.doorPanelBottom} />
                  <View style={[styles.knobWrap, { right: 10 }]}>
                    <View style={styles.knob} />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Right door */}
              <Animated.View
                pointerEvents={doorsOpen ? 'none' : 'auto'}
                style={[
                  styles.door,
                  styles.rightDoor,
                  {
                    height: interiorH,
                    transform: [
                      { perspective: 1200 },
                      { translateX: -(DOOR_W / 2) },
                      { rotateY: rightRotate },
                      { translateX: DOOR_W / 2 },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  onPress={toggleDoors}
                  activeOpacity={0.9}
                >
                  <View style={styles.doorPanelTop} />
                  <View style={styles.doorPanelBottom} />
                  <View style={[styles.knobWrap, { left: 10 }]}>
                    <View style={styles.knob} />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Center seam */}
              <View style={[styles.centerSeam, { height: interiorH }]} pointerEvents="none" />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const WOOD_DARK   = '#4A2811';
const WOOD_MED    = '#7B4A1E';
const WOOD_PANEL  = '#5C3317';
const WOOD_SHELF  = '#C4956A';
const WOOD_SHELF_TOP = '#D4A57A';
const INTERIOR_BG = '#EDE0C8';
const BRASS       = '#C9A84C';
const BRASS_DARK  = '#8B7333';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  container: { padding: 20, paddingBottom: 60 },

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

  toggleBtn: {
    backgroundColor: WOOD_MED,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  toggleBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  cupboardFrame: {
    width: CUPBOARD_W,
    alignSelf: 'center',
    backgroundColor: WOOD_DARK,
    borderRadius: 6,
    padding: FRAME,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },

  interior: {
    backgroundColor: INTERIOR_BG,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },

  shelfUnit: { marginHorizontal: 4 },
  shelfItems: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 2,
    minHeight: TILE + 8,
  },

  tile: {
    width: TILE,
    alignItems: 'center',
    position: 'relative',
  },
  tileImg: {
    width: TILE - 4,
    height: TILE - 4,
    borderRadius: 5,
    resizeMode: 'cover',
  },
  tileImgPlaceholder: {
    width: TILE - 4,
    height: TILE - 4,
    borderRadius: 5,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePlaceholderEmoji: { fontSize: 22 },
  tileLabel: {
    fontSize: 9,
    color: '#444',
    textAlign: 'center',
    marginTop: 3,
    width: TILE,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  removeBtn: {
    position: 'absolute',
    top: 1,
    right: 1,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: 'white', fontSize: 8, fontWeight: '800' },

  shelfPlank: {
    height: 10,
    backgroundColor: WOOD_SHELF,
    borderTopWidth: 2,
    borderTopColor: WOOD_SHELF_TOP,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  emptyHint: {
    paddingVertical: 24,
    alignItems: 'center',
    zIndex: 0,
  },
  emptyHintText: {
    fontSize: 13,
    color: '#bbb',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Doors
  door: {
    position: 'absolute',
    top: 0,
    width: DOOR_W,
    backgroundColor: WOOD_MED,
  },
  leftDoor: { left: 0 },
  rightDoor: { right: 0 },

  doorPanelTop: {
    position: 'absolute',
    top: 14,
    left: 10,
    right: 10,
    height: '40%',
    borderRadius: 3,
    borderWidth: 2,
    borderColor: WOOD_PANEL,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  doorPanelBottom: {
    position: 'absolute',
    bottom: 14,
    left: 10,
    right: 10,
    height: '40%',
    borderRadius: 3,
    borderWidth: 2,
    borderColor: WOOD_PANEL,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },

  knobWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: -9,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRASS,
    borderWidth: 1.5,
    borderColor: BRASS_DARK,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },

  centerSeam: {
    position: 'absolute',
    top: 0,
    left: DOOR_W - 1,
    width: 2,
    backgroundColor: WOOD_DARK,
    zIndex: 10,
    pointerEvents: 'none',
  },
});
