import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// Confetti piece colors — bright and varied.
const COLORS = ['#f4a261', '#2e86ab', '#e76f51', '#2a9d8f', '#e9c46a', '#c0392b', '#40916c', '#9b5de5', '#ff70a6'];
const PIECE_COUNT = 110;
const DURATION = 2600;

interface Props {
  /** Called once the burst animation has fully finished. */
  onDone?: () => void;
  /** Vertical origin as a fraction of screen height (0 = top, 1 = bottom). */
  originY?: number;
}

/**
 * A self-contained confetti explosion. Pieces burst radially from the origin
 * with an upward bias, then fall under "gravity" while spinning and fading.
 * Pure Animated (native driver) — no native modules, runs in Expo Go.
 */
export default function ConfettiBurst({ onDone, originY = 0.42 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  const pieces = useRef(
    Array.from({ length: PIECE_COUNT }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * (width * 0.55);
      return {
        burstX: Math.cos(angle) * distance,
        burstY: Math.sin(angle) * distance - (120 + Math.random() * 160), // upward bias on burst
        fallY: height * 0.55 + Math.random() * height * 0.5,
        drift: Math.random() * 80 - 40,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        w: 7 + Math.random() * 7,
        h: 9 + Math.random() * 9,
        spins: Math.random() * 6 - 3,
        round: Math.random() < 0.25,
      };
    })
  ).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      useNativeDriver: true,
    }).start(() => onDone && onDone());
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((p, i) => {
        const translateX = progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, p.burstX, p.burstX + p.drift],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, p.burstY, p.fallY],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.spins * 360}deg`],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.75, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: width / 2,
              top: height * originY,
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              borderRadius: p.round ? p.w : 2,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 150, elevation: 8 },
});
