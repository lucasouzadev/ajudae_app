import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useColors();

  const getStyle = () => {
    switch (status) {
      case 'completed':
      case 'resolved':
      case 'active':
        return { bg: colors.success + '20', text: colors.success, label: status };
      case 'open':
      case 'requested':
      case 'in_progress':
      case 'provider_en_route':
      case 'provider_arrived':
        return { bg: colors.primary + '20', text: colors.primary, label: status.replace(/_/g, ' ') };
      case 'under_review':
      case 'matching':
        return { bg: colors.warning + '20', text: colors.warning, label: status };
      case 'cancelled':
      case 'disputed':
        return { bg: colors.destructive + '20', text: colors.destructive, label: status };
      default:
        return { bg: colors.muted, text: colors.mutedForeground, label: status };
    }
  };

  const { bg, text, label } = getStyle();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
