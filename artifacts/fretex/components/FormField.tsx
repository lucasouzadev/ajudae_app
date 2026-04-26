import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function FormField({ label, error, children, style }: FormFieldProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {children}
      {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: 'Inter_500Medium',
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
});
