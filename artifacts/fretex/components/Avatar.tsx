import React from 'react';
import { StyleSheet, View, ViewStyle, Text } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';

interface AvatarProps {
  src?: string;
  name: string;
  size?: number;
  style?: ViewStyle;
  showRing?: boolean;
}

export function Avatar({ src, name, size = 48, style, showRing }: AvatarProps) {
  const colors = useColors();

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.muted,
      borderColor: showRing ? colors.primary : colors.border,
      borderWidth: showRing ? 2 : 1,
    },
    style,
  ];

  if (src) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: src }}
          style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
          contentFit="cover"
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={[styles.initials, { color: colors.mutedForeground, fontSize: size * 0.4 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
