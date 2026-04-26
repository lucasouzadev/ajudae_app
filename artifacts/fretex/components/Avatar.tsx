import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import colors, { fonts } from "@/constants/colors";

interface AvatarProps {
  initials: string;
  size?: number;
  color?: string;
  bordered?: boolean;
  style?: ViewStyle;
}

export function Avatar({ initials, size = 44, color, bordered, style }: AvatarProps) {
  const c = colors.light;
  const accent = color || c.primary;
  const fontSize = Math.round(size * 0.36);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={[accent, `${accent}AA`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.bg,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: bordered ? 3 : 0,
            borderColor: "#fff",
          },
        ]}
      >
        <Text style={[styles.text, { fontSize }]}>{initials}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontFamily: fonts.serif.extra },
});
