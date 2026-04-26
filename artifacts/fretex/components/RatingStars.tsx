import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors, { fonts } from "@/constants/colors";

interface RatingStarsProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
}

export function RatingStars({ rating, size = 14, showNumber = true }: RatingStarsProps) {
  const c = colors.light;
  return (
    <View style={styles.row}>
      <Ionicons name="star" size={size} color={c.warning} />
      {showNumber ? (
        <Text style={[styles.text, { color: c.warning, fontSize: size - 1 }]}>{rating.toFixed(1)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  text: { fontFamily: fonts.serif.extra },
});
