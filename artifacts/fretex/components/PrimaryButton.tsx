import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
}

export function PrimaryButton({ title, onPress, disabled, loading, style, variant = 'primary' }: PrimaryButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBackgroundColor = () => {
    if (disabled) return colors.muted;
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.secondary;
      case 'outline': return 'transparent';
      case 'destructive': return colors.destructive;
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.mutedForeground;
    switch (variant) {
      case 'primary': return colors.primaryForeground;
      case 'secondary': return colors.secondaryForeground;
      case 'outline': return colors.primary;
      case 'destructive': return colors.destructiveForeground;
      default: return colors.primaryForeground;
    }
  };

  const getBorderColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'outline': return colors.primary;
      default: return 'transparent';
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: colors.radius,
          opacity: pressed && !disabled ? 0.8 : 1,
        },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.title, { color: getTextColor() }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
