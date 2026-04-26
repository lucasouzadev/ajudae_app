import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints: number[];
  initialSnap?: number;
  onSnap?: (index: number) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function BottomSheet({ children, snapPoints, initialSnap = 0, onSnap }: BottomSheetProps) {
  const colors = useColors();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const contextY = useSharedValue(0);

  const getSnapPosition = (index: number) => {
    return SCREEN_HEIGHT - snapPoints[index];
  };

  useEffect(() => {
    translateY.value = withSpring(getSnapPosition(initialSnap), {
      damping: 20,
      stiffness: 90,
    });
  }, [initialSnap]);

  const snapTo = (position: number) => {
    'worklet';
    translateY.value = withSpring(position, { damping: 20, stiffness: 90 });
    
    // Find closest index
    if (onSnap) {
      let minDiff = Infinity;
      let bestIndex = 0;
      snapPoints.forEach((point, i) => {
        const p = SCREEN_HEIGHT - point;
        const diff = Math.abs(p - position);
        if (diff < minDiff) {
          minDiff = diff;
          bestIndex = i;
        }
      });
      runOnJS(onSnap)(bestIndex);
    }
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Don't let it be pulled above highest snap point (add some resistance)
      const highestSnap = getSnapPosition(snapPoints.length - 1);
      let newY = contextY.value + event.translationY;
      
      if (newY < highestSnap) {
        newY = highestSnap + (newY - highestSnap) * 0.2;
      }
      
      translateY.value = newY;
    })
    .onEnd((event) => {
      // Find nearest snap point considering velocity
      const targetY = translateY.value + event.velocityY * 0.2;
      
      let closestSnap = getSnapPosition(0);
      let minDiff = Infinity;

      snapPoints.forEach((point) => {
        const p = SCREEN_HEIGHT - point;
        const diff = Math.abs(p - targetY);
        if (diff < minDiff) {
          minDiff = diff;
          closestSnap = p;
        }
      });

      snapTo(closestSnap);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: colors.card, shadowColor: colors.text },
          animatedStyle,
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.mutedForeground }]} />
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
});
