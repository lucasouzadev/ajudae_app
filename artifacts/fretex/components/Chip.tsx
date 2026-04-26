import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import colors, { fonts, shadows } from "@/constants/colors";
import type { Category } from "@/constants/mockData";

interface ChipProps {
  label: string;
  active?: boolean;
  count?: number;
  category?: Category | null;
  onPress?: () => void;
}

export function Chip({ label, active, count, category, onPress }: ChipProps) {
  const c = colors.light;
  const bg = active ? c.text : c.card;
  const fg = active ? "#fff" : c.sub;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: bg },
        shadows.md,
      ]}
    >
      {category ? (
        <View style={{ marginRight: 4 }}>
          {category === "Mudança" ? (
            <Ionicons name="home" size={10} color={fg} />
          ) : category === "Frete" ? (
            <MaterialCommunityIcons name="truck" size={11} color={fg} />
          ) : (
            <Ionicons name="cube" size={10} color={fg} />
          )}
        </View>
      ) : null}
      <Text style={[styles.label, { color: fg, fontFamily: active ? fonts.sans.bold : fonts.sans.medium }]}>
        {label}
      </Text>
      {typeof count === "number" ? (
        <View
          style={[
            styles.countWrap,
            { backgroundColor: active ? "rgba(255,255,255,0.18)" : c.background },
          ]}
        >
          <Text style={[styles.countText, { color: active ? "#fff" : c.softMuted }]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 24,
    marginRight: 7,
  },
  label: { fontSize: 12 },
  countWrap: {
    marginLeft: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 9,
  },
  countText: { fontSize: 9, fontFamily: fonts.sans.bold },
});
