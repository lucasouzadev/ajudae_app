import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface IconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
  variant?: 'solid' | 'outline' | 'ghost';
}

export function IconButton({ icon, onPress, size = 24, color, style, variant = 'ghost' }: IconButtonProps) {
  const colors = useColors();

  const getBgColor = () => {
    if (variant === 'solid') return colors.muted;
    return 'transparent';
  };

  const getBorderColor = () => {
    if (variant === 'outline') return colors.border;
    return 'transparent';
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: getBgColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
      onPress={onPress}
    >
      <Feather name={icon} size={size} color={color || colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
