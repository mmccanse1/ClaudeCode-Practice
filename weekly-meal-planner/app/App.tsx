import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Weekly Meal Planner</Text>
      <Text style={styles.sub}>Setup is working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f0e8' },
  text: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  sub: { fontSize: 16, color: '#555' },
});
