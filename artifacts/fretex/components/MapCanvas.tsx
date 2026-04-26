import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';

interface MapCanvasProps {
  children?: React.ReactNode;
}

const { width, height } = Dimensions.get('window');

export function MapCanvas({ children }: MapCanvasProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.muted }]}>
      {/* Grid Pattern */}
      <View style={styles.grid}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLineHorizontal, { top: i * 50, backgroundColor: colors.border + '80' }]} />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineVertical, { left: i * 50, backgroundColor: colors.border + '80' }]} />
        ))}
      </View>

      {/* Pseudo Streets / Areas */}
      <View style={[styles.street, { top: '30%', left: 0, width: '100%', height: 40, backgroundColor: colors.background + '80' }]} />
      <View style={[styles.street, { top: '60%', left: 0, width: '100%', height: 60, backgroundColor: colors.background + '80' }]} />
      <View style={[styles.street, { top: 0, left: '40%', width: 50, height: '100%', backgroundColor: colors.background + '80' }]} />
      
      {/* Park Area */}
      <View style={[styles.park, { top: '10%', left: '60%', width: 120, height: 150, backgroundColor: colors.success + '20' }]} />

      {/* Soft overlay gradient */}
      <LinearGradient
        colors={[colors.background + '00', colors.background]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: 1,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: '100%',
  },
  street: {
    position: 'absolute',
  },
  park: {
    position: 'absolute',
    borderRadius: 20,
  },
});
