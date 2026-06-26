import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import HomeScreen from '../screens/HomeScreen';
import ScanReceiptScreen from '../screens/ScanReceiptScreen';
import PantryScreen from '../screens/PantryScreen';
import PantryShelvesScreen from '../screens/PantryShelvesScreen';
import MealPlanScreen from '../screens/MealPlanScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import SavedRecipesScreen from '../screens/SavedRecipesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#f5f0e8' },
          headerTintColor: '#2e86ab',
          headerTitleStyle: { fontWeight: '700', color: '#1a1a1a' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#f5f0e8' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ScanReceipt"
          component={ScanReceiptScreen}
          options={{ title: 'Scan Receipt' }}
        />
        <Stack.Screen
          name="Pantry"
          component={PantryScreen}
          options={{ title: 'My Pantry' }}
        />
        <Stack.Screen
          name="PantryShelf"
          component={PantryShelvesScreen}
          options={{ title: 'My Pantry', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="MealPlan"
          component={MealPlanScreen}
          options={{ title: 'Menu', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="RecipeDetail"
          component={RecipeDetailScreen}
          options={({ route }) => ({
            title: route.params.recipe.name,
            headerBackTitle: 'Back',
          })}
        />
        <Stack.Screen
          name="SavedRecipes"
          component={SavedRecipesScreen}
          options={{ title: 'Saved Recipes' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
