import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Provider } from '@/constants/mockData';
import { Avatar } from './Avatar';
import { Feather } from '@expo/vector-icons';

interface ServiceCardProps {
  provider: Provider;
  onPress: () => void;
}

export function ServiceCard({ provider, onPress }: ServiceCardProps) {
  const colors = useColors();

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Avatar initials={provider.ini} size={48} color={provider.color} bordered={provider.isOnline} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {provider.name}
          </Text>
          <View style={styles.metaRow}>
            <Feather name="star" size={14} color={colors.warning} />
            <Text style={[styles.rating, { color: colors.foreground }]}>{provider.rating}</Text>
            <Text style={[styles.dot, { color: colors.mutedForeground }]}>•</Text>
            <Text style={[styles.category, { color: colors.mutedForeground }]}>{provider.cat}</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={[styles.pricePrefix, { color: colors.mutedForeground }]}>a partir de</Text>
          <Text style={[styles.price, { color: colors.foreground }]}>R$ {provider.priceFrom}</Text>
        </View>
      </View>
      
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Feather name="map-pin" size={14} color={colors.mutedForeground} />
        <Text style={[styles.neighborhood, { color: colors.mutedForeground }]}>
          Atende em: {provider.area || `${provider.km} km`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  dot: {
    fontSize: 14,
  },
  category: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  pricePrefix: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  neighborhood: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
