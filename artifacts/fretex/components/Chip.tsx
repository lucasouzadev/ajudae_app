import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, style }: ChipProps) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: selected ? colors.primary : colors.muted,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? colors.primaryForeground : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
});
