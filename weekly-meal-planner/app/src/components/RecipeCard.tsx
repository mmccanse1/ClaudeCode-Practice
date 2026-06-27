import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Recipe } from '../types';
import { DIET_TYPES } from '../constants/dietTypes';

interface Props {
  recipe: Recipe;
  onPress: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshDisabled?: boolean;
}

export default function RecipeCard({ recipe, onPress, onRefresh, refreshing, refreshDisabled }: Props) {
  const dietConfig = DIET_TYPES.find(d => d.id === recipe.dietType) ?? DIET_TYPES[0];
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
            <Text style={styles.dietText}>{dietConfig.label}</Text>
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
        {onRefresh && (
          <View style={styles.refreshRow}>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefresh}
              disabled={refreshing || refreshDisabled}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#2e86ab" />
              ) : (
                <Text style={styles.refreshIcon}>↺</Text>
              )}
              <Text style={styles.refreshLabel}>
                {refreshing ? 'Generating…' : 'New recipe'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    color: '#5b7a8c',
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
    color: '#5b7a8c',
    fontWeight: '500',
  },
  refreshRow: {
    borderTopWidth: 1,
    borderTopColor: '#eef4f8',
    marginTop: 12,
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  refreshIcon: {
    fontSize: 18,
    color: '#2e86ab',
    fontWeight: '700',
    lineHeight: 20,
  },
  refreshLabel: {
    fontSize: 12,
    color: '#2e86ab',
    fontWeight: '600',
  },
});
