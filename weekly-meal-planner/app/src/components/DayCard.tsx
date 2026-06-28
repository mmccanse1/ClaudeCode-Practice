import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface Props {
  day: string;
  /** Served-meal scene (or the main dish's photo as a fallback). */
  photoUrl?: string;
  /** True while the scene image is still being generated. */
  loading?: boolean;
  onPress: () => void;
}

// A photo-led card for a day that has more than one dish (e.g. dinner + side):
// the meal pictured served on a table, with the day of the week in a warm,
// shadowed label centered along the bottom — no dish titles. Tapping opens the
// day's full recipes.
export default function DayCard({ day, photoUrl, loading, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} />
      ) : (
        <View style={styles.placeholder}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.placeholderEmoji}>🍽</Text>
          )}
        </View>
      )}

      {/* Soft darkening only at the very bottom strip, so the warm label stays
          legible over a busy table without washing out the food above it. */}
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={styles.dayLabel} allowFontScaling={false}>{day}</Text>
      </View>

      <View style={styles.chevron} pointerEvents="none">
        <Text style={styles.chevronText}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#a8dadc',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    height: 190,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  photo: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#a8dadc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 56 },
  // A short, faint bottom band — just enough to seat the label, not a full overlay.
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    backgroundColor: 'rgba(40,26,12,0.28)',
  },
  labelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    alignItems: 'center',
  },
  // Warm cream label with a strong dark glow so the day reads clearly whatever
  // the photo behind it looks like.
  dayLabel: {
    color: '#fdeccf',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  chevron: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: { color: 'white', fontSize: 20, fontWeight: '400', lineHeight: 22, marginTop: -2 },
});
