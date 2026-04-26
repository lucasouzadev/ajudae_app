import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import colors, { fonts, shadows } from "@/constants/colors";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: "lg" | "md" | "sm";
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  variant = "primary",
  color,
  icon,
  size = "lg",
}: PrimaryButtonProps) {
  const c = colors.light;
  const accent = color || c.primary;

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const bg =
    disabled
      ? c.muted
      : variant === "primary"
        ? accent
        : variant === "secondary"
          ? c.background
          : variant === "ghost"
            ? "transparent"
            : "transparent";

  const fg =
    disabled
      ? c.softMuted
      : variant === "primary"
        ? "#fff"
        : variant === "outline"
          ? accent
          : c.text;

  const heightMap = { lg: 52, md: 46, sm: 40 } as const;
  const fontMap = { lg: 14, md: 13, sm: 12 } as const;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          height: heightMap[size],
          borderColor: variant === "outline" ? accent : "transparent",
          borderWidth: variant === "outline" ? 1.5 : 0,
          opacity: pressed && !disabled ? 0.85 : 1,
        },
        variant === "primary" && !disabled ? { ...shadows.md, shadowColor: accent, shadowOpacity: 0.35 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={16} color={fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.title, { color: fg, fontSize: fontMap[size] }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: { fontFamily: fonts.sans.extra },
});
