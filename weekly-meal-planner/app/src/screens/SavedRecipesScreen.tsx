import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../types';
import RecipeCard from '../components/RecipeCard';
import { getSavedRecipes } from '../services/savedRecipesService';
import { getSavedMenus, deleteMenu, SavedMenu } from '../services/savedMenusService';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedRecipes'>;
type Tab = 'recipes' | 'menus';

export default function SavedRecipesScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('recipes');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menus, setMenus] = useState<SavedMenu[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSavedRecipes().then(setRecipes);
      getSavedMenus().then(setMenus);
    }, [])
  );

  function handleDeleteMenu(menu: SavedMenu) {
    Alert.alert(
      'Delete Menu',
      `Delete "${menu.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMenu(menu.id);
            setMenus(prev => prev.filter(m => m.id !== menu.id));
          },
        },
      ]
    );
  }

  const TabBar = (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'recipes' && styles.tabBtnActive]}
        onPress={() => setActiveTab('recipes')}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabBtnText, activeTab === 'recipes' && styles.tabBtnTextActive]}>
          🔖  Recipes
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'menus' && styles.tabBtnActive]}
        onPress={() => setActiveTab('menus')}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabBtnText, activeTab === 'menus' && styles.tabBtnTextActive]}>
          📋  Menus
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (activeTab === 'menus') {
    return (
      <SafeAreaView style={styles.safe}>
        <FlatList
          data={menus}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Saved Recipes & Menus</Text>
              {TabBar}
              <Text style={styles.subtitle}>
                {menus.length === 0
                  ? 'No saved menus yet.'
                  : `${menus.length} menu${menus.length !== 1 ? 's' : ''} saved`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>
                Open a menu and tap Save This Menu to keep it here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() =>
                navigation.navigate('MealPlan', {
                  recipes: item.recipes,
                  ingredients: item.ingredients,
                  dietType: item.dietType,
                  saved: true,
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.menuCardBody}>
                <Text style={styles.menuName}>{item.name}</Text>
                <Text style={styles.menuMeta}>
                  {item.recipes.length} recipes · {item.ingredients.length} ingredients
                </Text>
                <Text style={styles.menuDate}>
                  Saved {new Date(item.savedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteMenu(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={recipes}
        keyExtractor={(item, i) => `${item.name}-${i}`}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Saved Recipes & Menus</Text>
            {TabBar}
            <Text style={styles.subtitle}>
              {recipes.length === 0
                ? 'No saved recipes yet.'
                : `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} saved`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🫒</Text>
            <Text style={styles.emptyText}>
              Open any recipe and tap Save Recipe to bookmark it here.
            </Text>
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
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginTop: 12 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: { backgroundColor: '#2e86ab' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabBtnTextActive: { color: 'white' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },

  menuCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuCardBody: { flex: 1 },
  menuName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  menuMeta: { fontSize: 13, color: '#2e86ab', fontWeight: '600', marginBottom: 2 },
  menuDate: { fontSize: 12, color: '#aaa' },
  deleteBtn: { padding: 6 },
  deleteBtnText: { color: '#ccc', fontSize: 16, fontWeight: '700' },
});
