import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { Avatar } from './Avatar';

interface ProviderPinProps {
  id: string;
  avatar: string;
  name: string;
  x: number;
  y: number;
  isOnline: boolean;
  onPress?: () => void;
  isUser?: boolean;
}

export function ProviderPin({ id, avatar, name, x, y, isOnline, onPress, isUser }: ProviderPinProps) {
  const colors = useColors();
  
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  React.useEffect(() => {
    if (isOnline || isUser) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 1500 }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1500 }),
          withTiming(0.6, { duration: 0 })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = 1;
      pulseOpacity.value = 0;
    }
  }, [isOnline, isUser]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const pinColor = isUser ? '#3B82F6' : colors.primary;

  return (
    <Pressable
      style={[styles.container, { left: x, top: y }]}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.pulseRing,
          { backgroundColor: pinColor },
          pulseStyle,
        ]}
      />
      {isUser ? (
        <View style={[styles.userDot, { backgroundColor: pinColor }]} />
      ) : (
        <Avatar src={avatar} name={name} size={40} showRing />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    zIndex: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
