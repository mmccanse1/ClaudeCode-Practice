import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  item: string;
  onRemove: (item: string) => void;
}

export default function PantryItemRow({ item, onRemove }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.label}>{item}</Text>
      <TouchableOpacity onPress={() => onRemove(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.remove}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bullet: {
    color: '#f4a261',
    fontSize: 18,
    marginRight: 10,
    fontWeight: '700',
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: '#2c2c2c',
    textTransform: 'capitalize',
  },
  remove: {
    color: '#bbb',
    fontSize: 14,
    fontWeight: '700',
  },
});
