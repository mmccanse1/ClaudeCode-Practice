import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../types';
import RecipeCard from '../components/RecipeCard';
import { getSavedRecipes } from '../services/savedRecipesService';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedRecipes'>;

export default function SavedRecipesScreen({ navigation }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSavedRecipes().then(setRecipes);
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={recipes}
        keyExtractor={(item, i) => `${item.name}-${i}`}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Saved Recipes</Text>
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
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
});
