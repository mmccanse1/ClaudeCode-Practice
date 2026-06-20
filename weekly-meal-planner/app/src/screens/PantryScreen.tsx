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
  ImageBackground,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getPantryItems, addPantryItem, removePantryItem, clearPantry } from '../services/pantryService';
import { fetchIngredientPhoto } from '../services/unsplashService';

type Props = NativeStackScreenProps<RootStackParamList, 'Pantry'>;

const WARDROBE_URL =
  'https://media.istockphoto.com/id/1199441361/photo/antique-mahogany-bedroom-wardrobe-closed-isolated-on-white.jpg?s=1024x1024&w=is&k=20&c=k-PZSDKOBLfoRr94wcfq4_uhMGIhx6fXB-uJMrmasG0=';
const WOOD_GRAIN_URL =
  'https://images.unsplash.com/photo-1602990721338-9cbb5b983c4d?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const SHELF_URL =
  'https://plus.unsplash.com/premium_photo-1675782999354-2f2711e437a5?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CUPBOARD_W = SCREEN_W - 24;
const CUPBOARD_H = Math.round(SCREEN_H * 0.68);
const INTERIOR_W = Math.round(CUPBOARD_W * 0.70);
const INTERIOR_H = Math.round(CUPBOARD_H * 0.75);
const INTERIOR_TOP = Math.round((CUPBOARD_H - INTERIOR_H) * 0.38);
const INTERIOR_LEFT = Math.round((CUPBOARD_W - INTERIOR_W) / 2);
const DOOR_W = INTERIOR_W / 2;
const ITEMS_PER_ROW = 3;
const TILE = Math.floor((INTERIOR_W - 12) / ITEMS_PER_ROW);
const BRASS = '#C9A84C';
const BRASS_DARK = '#8B7333';

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

        <TouchableOpacity style={styles.toggleBtn} onPress={toggleDoors} activeOpacity={0.82}>
          <Text style={styles.toggleBtnText}>
            {doorsOpen ? '🔒  Close Pantry' : '🚪  Open Pantry'}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color="#2e86ab" style={{ marginTop: 40 }} />
        ) : (
          <ImageBackground
            source={{ uri: WARDROBE_URL }}
            style={[styles.cupboard, { height: CUPBOARD_H }]}
            imageStyle={styles.cupboardImg}
          >
            {/* Interior — positioned to overlap the wardrobe doors in the photo */}
            <View
              style={[
                styles.interior,
                {
                  width: INTERIOR_W,
                  height: INTERIOR_H,
                  top: INTERIOR_TOP,
                  left: INTERIOR_LEFT,
                },
              ]}
            >
              {/* Shelves */}
              <ScrollView
                scrollEnabled={doorsOpen}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={styles.shelvesContent}
              >
                {items.length === 0 && (
                  <View style={styles.emptyHint}>
                    <Text style={styles.emptyHintText}>
                      Add ingredients above to stock your pantry
                    </Text>
                  </View>
                )}
                {rows.map((row, ri) => (
                  <View key={ri} style={styles.shelfUnit}>
                    <View style={styles.shelfItems}>
                      {row.map(item => (
                        <View key={item} style={[styles.tile, { width: TILE }]}>
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
                              style={[styles.tileImg, { width: TILE - 6, height: TILE - 6 }]}
                            />
                          ) : (
                            <View style={[styles.tilePlaceholder, { width: TILE - 6, height: TILE - 6 }]}>
                              <Text style={styles.tilePlaceholderEmoji}>🥘</Text>
                            </View>
                          )}
                          <Text style={styles.tileLabel} numberOfLines={1}>{item}</Text>
                        </View>
                      ))}
                    </View>
                    <ImageBackground
                      source={{ uri: SHELF_URL }}
                      style={styles.shelfPlank}
                      imageStyle={styles.shelfPlankImg}
                    >
                      <View style={styles.shelfPlankTint} />
                    </ImageBackground>
                  </View>
                ))}
              </ScrollView>

              {/* Left door */}
              <Animated.View
                pointerEvents={doorsOpen ? 'none' : 'auto'}
                style={[
                  styles.door,
                  styles.leftDoor,
                  {
                    height: INTERIOR_H,
                    transform: [
                      { perspective: 1200 },
                      { translateX: DOOR_W / 2 },
                      { rotateY: leftRotate },
                      { translateX: -(DOOR_W / 2) },
                    ],
                  },
                ]}
              >
                <ImageBackground
                  source={{ uri: WOOD_GRAIN_URL }}
                  style={StyleSheet.absoluteFill}
                  imageStyle={styles.doorImg}
                >
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={toggleDoors}
                    activeOpacity={0.9}
                  >
                    <View style={styles.doorShade} />
                    <View style={styles.doorPanelTop} />
                    <View style={styles.doorPanelBottom} />
                    <View style={[styles.knobWrap, { right: 10 }]}>
                      <View style={styles.knob} />
                    </View>
                  </TouchableOpacity>
                </ImageBackground>
              </Animated.View>

              {/* Right door */}
              <Animated.View
                pointerEvents={doorsOpen ? 'none' : 'auto'}
                style={[
                  styles.door,
                  styles.rightDoor,
                  {
                    height: INTERIOR_H,
                    transform: [
                      { perspective: 1200 },
                      { translateX: -(DOOR_W / 2) },
                      { rotateY: rightRotate },
                      { translateX: DOOR_W / 2 },
                    ],
                  },
                ]}
              >
                <ImageBackground
                  source={{ uri: WOOD_GRAIN_URL }}
                  style={StyleSheet.absoluteFill}
                  imageStyle={styles.doorImg}
                >
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={toggleDoors}
                    activeOpacity={0.9}
                  >
                    <View style={styles.doorShade} />
                    <View style={styles.doorPanelTop} />
                    <View style={styles.doorPanelBottom} />
                    <View style={[styles.knobWrap, { left: 10 }]}>
                      <View style={styles.knob} />
                    </View>
                  </TouchableOpacity>
                </ImageBackground>
              </Animated.View>

              {/* Center seam */}
              <View
                style={[styles.centerSeam, { height: INTERIOR_H }]}
                pointerEvents="none"
              />
            </View>
          </ImageBackground>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  toggleBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  cupboard: {
    width: CUPBOARD_W,
    alignSelf: 'center',
  },
  cupboardImg: { resizeMode: 'cover' },

  interior: {
    position: 'absolute',
    backgroundColor: 'rgba(20,10,3,0.60)',
    overflow: 'hidden',
  },

  shelvesContent: { paddingBottom: 8 },

  shelfUnit: {},
  shelfItems: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 2,
  },

  tile: {
    alignItems: 'center',
    position: 'relative',
  },
  tileImg: {
    borderRadius: 5,
    resizeMode: 'cover',
  },
  tilePlaceholder: {
    borderRadius: 5,
    backgroundColor: 'rgba(200,170,120,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePlaceholderEmoji: { fontSize: 22 },
  tileLabel: {
    fontSize: 9,
    color: '#e8d4aa',
    textAlign: 'center',
    marginTop: 3,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  removeBtn: {
    position: 'absolute',
    top: 1,
    right: 1,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: 'white', fontSize: 8, fontWeight: '800' },

  shelfPlank: { height: 12 },
  shelfPlankImg: { resizeMode: 'cover' },
  shelfPlankTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(60,30,5,0.35)',
  },

  emptyHint: { paddingVertical: 30, alignItems: 'center' },
  emptyHintText: {
    fontSize: 12,
    color: 'rgba(230,200,150,0.75)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  door: {
    position: 'absolute',
    top: 0,
    width: DOOR_W,
  },
  leftDoor: { left: 0 },
  rightDoor: { right: 0 },

  doorImg: { resizeMode: 'cover' },
  doorShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  doorPanelTop: {
    position: 'absolute',
    top: 14,
    left: 10,
    right: 10,
    height: '40%',
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,120,0.22)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  doorPanelBottom: {
    position: 'absolute',
    bottom: 14,
    left: 10,
    right: 10,
    height: '40%',
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,120,0.22)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  knobWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: -10,
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRASS,
    borderWidth: 1.5,
    borderColor: BRASS_DARK,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  centerSeam: {
    position: 'absolute',
    top: 0,
    left: DOOR_W - 1,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
});
