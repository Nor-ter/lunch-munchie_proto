/**
 * SwipeableRow
 * Wraps a child with left-swipe → reveal delete button.
 * Uses react-native-gesture-handler + react-native-reanimated 3.
 */
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { THEME } from '@/constants/theme';

const DELETE_WIDTH = 80;
const TRIGGER_THRESHOLD = -DELETE_WIDTH * 0.6;

interface Props {
  children: React.ReactNode;
  onDelete: () => void;
}

export function SwipeableRow({ children, onDelete }: Props) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      translateX.value = Math.min(0, Math.max(-DELETE_WIDTH, next));
    })
    .onEnd(() => {
      if (translateX.value < TRIGGER_THRESHOLD) {
        translateX.value = withSpring(-DELETE_WIDTH);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, (-translateX.value) / DELETE_WIDTH),
  }));

  const close = () => {
    translateX.value = withSpring(0);
  };

  const handleDelete = () => {
    close();
    onDelete();
  };

  return (
    <Animated.View style={styles.container}>
      {/* Delete button (revealed beneath) */}
      <Animated.View style={[styles.deleteBtn, deleteStyle]}>
        <Pressable onPress={handleDelete} style={styles.deletePressable}>
          <Text style={styles.deleteText}>삭제</Text>
        </Pressable>
      </Animated.View>

      {/* Swipeable row */}
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.deleteRed,
    borderRadius: 12,
  },
  deletePressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: THEME.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
