import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import colors, { fonts } from "@/constants/colors";
import { PrimaryButton } from "@/components/PrimaryButton";

// Drop mascot PNGs into assets/images/mascot/ and these require() calls will resolve:
// mascot-running.png  → estados de espera / vazio ativo
// mascot-standing.png → estados neutros / informativos
const MASCOT_ASSETS = {
  running: (() => {
    try { return require("@/assets/images/mascot/mascot-running.png"); } catch { return null; }
  })(),
  standing: (() => {
    try { return require("@/assets/images/mascot/mascot-standing.png"); } catch { return null; }
  })(),
};

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  mascotVariant?: "running" | "standing" | "none";
  action?: { title: string; onPress: () => void };
}

export function EmptyState({
  title,
  subtitle,
  mascotVariant = "standing",
  action,
}: EmptyStateProps) {
  const c = colors.light;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mascotVariant === "none") return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 6, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [floatAnim, mascotVariant]);

  const mascotSource = mascotVariant !== "none" ? MASCOT_ASSETS[mascotVariant] : null;

  return (
    <View style={styles.container}>
      {mascotSource ? (
        <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
          <Image source={mascotSource} style={styles.mascot} resizeMode="contain" />
        </Animated.View>
      ) : (
        // Placeholder until mascot assets are added — ocupa o mesmo espaço
        <Animated.View
          style={[
            styles.mascotPlaceholder,
            { backgroundColor: c.primaryLight, transform: [{ translateY: floatAnim }] },
          ]}
        />
      )}

      <Text style={[styles.title, { color: c.text, fontFamily: fonts.serif.bold }]}>
        {title}
      </Text>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: c.softMuted, fontFamily: fonts.sans.regular }]}>
          {subtitle}
        </Text>
      ) : null}

      {action ? (
        <View style={styles.actionWrap}>
          <PrimaryButton title={action.title} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 12,
  },
  mascot: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  mascotPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
    opacity: 0.4,
  },
  title: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actionWrap: {
    marginTop: 8,
    width: "100%",
  },
});
