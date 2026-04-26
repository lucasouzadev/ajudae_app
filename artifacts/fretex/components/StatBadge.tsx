import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface StatBadgeProps {
  title: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  trend?: string;
  trendUp?: boolean;
}

export function StatBadge({ title, value, icon, trend, trendUp }: StatBadgeProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.mutedForeground }]}>{title}</Text>
        <Feather name={icon} size={16} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      {trend && (
        <View style={styles.trendRow}>
          <Feather
            name={trendUp ? 'trending-up' : 'trending-down'}
            size={12}
            color={trendUp ? colors.success : colors.destructive}
          />
          <Text style={[styles.trend, { color: trendUp ? colors.success : colors.destructive }]}>
            {trend}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trend: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
});
