import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🫒</Text>
          <Text style={styles.title}>Weekly Meal Planner</Text>
          <Text style={styles.subtitle}>
            Mediterranean diet · Powered by your pantry
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ready to plan your week?</Text>
          <Text style={styles.cardBody}>
            Scan your grocery receipt and add your pantry items. We'll generate
            7 Mediterranean diet recipes tailored to what you have on hand.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('ScanReceipt')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>📸  Start New Meal Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Pantry')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>🗄  Manage Pantry</Text>
        </TouchableOpacity>

        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How it works</Text>
          {[
            ['1', 'Photograph your grocery receipt'],
            ['2', 'Add items already in your pantry'],
            ['3', 'Get 7 Mediterranean recipes generated for you'],
            ['4', 'Save and share beautifully formatted recipe cards'],
          ].map(([num, text]) => (
            <View key={num} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{num}</Text>
              </View>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.source}>
          Recipes follow Mayo Clinic Mediterranean diet guidelines
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f0e8' },
  container: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  cardBody: { fontSize: 14, color: '#555', lineHeight: 22 },
  primaryBtn: {
    backgroundColor: '#2e86ab',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: '#2e86ab',
  },
  secondaryBtnText: { color: '#2e86ab', fontSize: 17, fontWeight: '700' },
  howItWorks: { marginBottom: 24 },
  howTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 14 },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2e86ab',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: 'white', fontWeight: '700', fontSize: 14 },
  stepText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 20 },
  source: { textAlign: 'center', fontSize: 11, color: '#aaa', marginBottom: 8 },
});
