import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';

export default function ProfileStubScreen() {
  const colors = useColors();

  // The actual profile interaction happens via the top-sheet on the Home tab.
  // This tab serves as a direct way to trigger that or show a placeholder.

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        Acesse seu perfil tocando na foto na tela Inicial.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
