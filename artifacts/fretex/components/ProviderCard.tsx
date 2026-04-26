import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Avatar } from './Avatar';
import { Provider } from '@/constants/mockData';

interface ProviderCardProps {
  provider: Provider;
  onPress: () => void;
  layout?: 'horizontal' | 'vertical';
}

export function ProviderCard({ provider, onPress, layout = 'horizontal' }: ProviderCardProps) {
  const colors = useColors();

  if (layout === 'vertical') {
    return (
      <Pressable
        style={[styles.vContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
      >
        <Avatar src={provider.avatar} name={provider.name} size={64} showRing={provider.isOnline} />
        <View style={styles.vContent}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{provider.name}</Text>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>{provider.category}</Text>
          
          <View style={styles.ratingRow}>
            <Feather name="star" size={14} color={colors.warning} style={{ fill: colors.warning }} />
            <Text style={[styles.rating, { color: colors.foreground }]}>{provider.rating}</Text>
            <Text style={[styles.reviews, { color: colors.mutedForeground }]}>({provider.reviews})</Text>
          </View>
        </View>
        
        <View style={[styles.priceTag, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.pricePrefix, { color: colors.primary }]}>a partir de</Text>
          <Text style={[styles.price, { color: colors.primary }]}>R$ {provider.priceFrom}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.hContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <Avatar src={provider.avatar} name={provider.name} size={56} showRing={provider.isOnline} />
      <View style={styles.hContent}>
        <View style={styles.hHeader}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{provider.name}</Text>
          <View style={styles.ratingRow}>
            <Feather name="star" size={14} color={colors.warning} style={{ fill: colors.warning }} />
            <Text style={[styles.rating, { color: colors.foreground }]}>{provider.rating}</Text>
          </View>
        </View>
        
        <Text style={[styles.category, { color: colors.mutedForeground }]}>{provider.category} • {provider.neighborhood}</Text>
        
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.foreground }]}>R$ {provider.priceFrom}</Text>
          <Text style={[styles.pricePrefix, { color: colors.mutedForeground }]}>/base</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  vContainer: {
    width: 160,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 12,
  },
  vContent: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  category: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  reviews: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  priceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  pricePrefix: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },

  hContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  hContent: {
    flex: 1,
    marginLeft: 16,
  },
  hHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    gap: 4,
  },
});
