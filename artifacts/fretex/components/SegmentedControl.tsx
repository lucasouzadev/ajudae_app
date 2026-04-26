import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface SegmentedControlProps {
  tabs: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ tabs, selectedIndex, onChange }: SegmentedControlProps) {
  const colors = useColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
      {tabs.map((tab, index) => {
        const isSelected = index === selectedIndex;
        
        return (
          <Pressable
            key={index}
            style={styles.tab}
            onPress={() => onChange(index)}
          >
            {isSelected && (
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.card,
                    borderRadius: colors.radius - 2,
                    margin: 2,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  },
                ]}
              />
            )}
            <Text
              style={[
                styles.tabText,
                {
                  color: isSelected ? colors.foreground : colors.mutedForeground,
                  fontWeight: isSelected ? '600' : '500',
                },
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 2,
    height: 40,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    zIndex: 1,
  },
});
