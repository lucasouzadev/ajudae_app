import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import colors, { fonts, shadows } from "@/constants/colors";
import type { Category } from "@/constants/mockData";

interface ProviderPinProps {
  category: Category;
  price: string;
  active?: boolean;
  color: string;
  onPress?: () => void;
}

export function ProviderPin({ category, price, active, color, onPress }: ProviderPinProps) {
  const c = colors.light;
  const bg = active ? color : c.card;
  const fg = active ? "#fff" : c.text;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pin,
        {
          backgroundColor: bg,
          borderColor: active ? "transparent" : c.border,
          borderWidth: active ? 0 : 1.5,
        },
        active ? { ...shadows.md, shadowColor: color, shadowOpacity: 0.45 } : shadows.md,
        active && { transform: [{ scale: 1.06 }] },
      ]}
    >
      <View style={{ opacity: active ? 1 : 0.75 }}>
        {category === "Mudança" ? (
          <Ionicons name="home" size={11} color={fg} />
        ) : category === "Frete" ? (
          <MaterialCommunityIcons name="truck" size={12} color={fg} />
        ) : (
          <Ionicons name="cube" size={11} color={fg} />
        )}
      </View>
      <Text style={[styles.priceText, { color: fg }]}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: { fontSize: 11, fontFamily: fonts.serif.extra },
});
