import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface RatingStarsProps {
  rating: number;
  size?: number;
}

export function RatingStars({ rating, size = 16 }: RatingStarsProps) {
  const colors = useColors();
  
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Feather
          key={star}
          name="star"
          size={size}
          color={star <= Math.round(rating) ? colors.warning : colors.muted}
          style={{ fill: star <= Math.round(rating) ? colors.warning : 'transparent' }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
  },
});
