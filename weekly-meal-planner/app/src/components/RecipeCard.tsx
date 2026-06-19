import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Recipe } from '../types';

interface Props {
  recipe: Recipe;
  onPress: () => void;
}

export default function RecipeCard({ recipe, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {recipe.photoUrl ? (
        <Image source={{ uri: recipe.photoUrl }} style={styles.photo} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.placeholderEmoji}>🫒</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayText}>{recipe.day}</Text>
          </View>
          <View style={styles.dietBadge}>
            <Text style={styles.dietText}>Mediterranean</Text>
          </View>
        </View>
        <Text style={styles.name}>{recipe.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {recipe.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>⏱ Prep: {recipe.prepTime}</Text>
          <Text style={styles.meta}>🍳 Cook: {recipe.cookTime}</Text>
          <Text style={styles.meta}>👥 {recipe.servings} servings</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: 180,
  },
  photoPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#a8dadc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 60,
  },
  body: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  dayBadge: {
    backgroundColor: '#2e86ab',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 12,
  },
  dayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dietBadge: {
    backgroundColor: '#e8f8f9',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  dietText: {
    color: '#1d5c63',
    fontSize: 11,
    fontWeight: '600',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  meta: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
});
