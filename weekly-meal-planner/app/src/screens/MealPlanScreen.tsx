import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import RecipeCard from '../components/RecipeCard';
import { saveMenu } from '../services/savedMenusService';

type Props = NativeStackScreenProps<RootStackParamList, 'MealPlan'>;

export default function MealPlanScreen({ navigation, route }: Props) {
  const { recipes, ingredients } = route.params;
  const [saving, setSaving] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);

  async function handleSaveMenu() {
    setSaving(true);
    try {
      await saveMenu(recipes, ingredients);
      setMenuSaved(true);
      Alert.alert('Menu Saved!', 'This meal plan has been saved to your Menus folder.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={recipes}
        keyExtractor={item => item.day}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Your Week of Meals</Text>
            <Text style={styles.subtitle}>
              7 Mediterranean recipes built from {ingredients.length} ingredients.
              Tap any recipe for the full card.
            </Text>
            <TouchableOpacity
              style={[styles.saveMenuBtn, menuSaved && styles.saveMenuBtnSaved]}
              onPress={handleSaveMenu}
              disabled={saving || menuSaved}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveMenuBtnText}>
                  {menuSaved ? '✓  Menu Saved' : '💾  Save This Menu'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  list: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 16 },
  saveMenuBtn: {
    backgroundColor: '#f4a261',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveMenuBtnSaved: { backgroundColor: '#1d5c63' },
  saveMenuBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});
