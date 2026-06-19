import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import RecipeCard from '../components/RecipeCard';

type Props = NativeStackScreenProps<RootStackParamList, 'MealPlan'>;

export default function MealPlanScreen({ navigation, route }: Props) {
  const { recipes, ingredients } = route.params;

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
});
