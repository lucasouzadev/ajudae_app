import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors, { fonts, shadows } from "@/constants/colors";

export interface InfoItem {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
}

interface InfoSheetProps {
  /** Chave única para AsyncStorage — controla se já foi visto */
  storageKey: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
  items: InfoItem[];
  /** Controlado externamente: true para forçar abertura (ex: botão ℹ) */
  forceOpen?: boolean;
  onClose?: () => void;
}

export function InfoSheet({
  storageKey,
  title,
  subtitle,
  accentColor,
  items,
  forceOpen = false,
  onClose,
}: InfoSheetProps) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const accent = accentColor ?? c.primary;
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 58, friction: 14, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      onClose?.();
    });
  };

  // Auto-abrir na primeira visita
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((val) => {
      if (!val) {
        AsyncStorage.setItem(storageKey, "1");
        open();
      }
    });
  }, []);

  // Abrir via prop externa (botão ℹ)
  useEffect(() => {
    if (forceOpen && !visible) open();
  }, [forceOpen]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)", opacity: backdropAnim }]}
        pointerEvents="auto"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          s.sheet,
          {
            backgroundColor: c.card,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }],
          },
          shadows.xl,
        ]}
      >
        {/* Handle */}
        <View style={[s.handle, { backgroundColor: c.border }]} />

        {/* Header */}
        <View style={s.header}>
          <View style={[s.accentBar, { backgroundColor: accent }]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: c.text }]}>{title}</Text>
            {subtitle ? <Text style={[s.subtitle, { color: c.sub }]}>{subtitle}</Text> : null}
          </View>
          <Pressable onPress={close} style={[s.closeBtn, { backgroundColor: c.background }]}>
            <Ionicons name="close" size={16} color={c.text} />
          </Pressable>
        </View>

        {/* Items */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.itemsContainer}
        >
          {items.map((item, i) => (
            <View key={i} style={[s.item, { borderColor: c.borderLight }]}>
              <View style={[s.itemIcon, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.itemTitle, { color: c.text }]}>{item.title}</Text>
                <Text style={[s.itemDesc, { color: c.sub }]}>{item.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* CTA */}
        <Pressable
          onPress={close}
          style={[s.cta, { backgroundColor: accent }, shadows.md, { shadowColor: accent, shadowOpacity: 0.3 }]}
        >
          <Ionicons name="checkmark-circle" size={17} color={accent === c.primary ? "#1A1714" : "#fff"} />
          <Text style={[s.ctaText, { color: accent === c.primary ? "#1A1714" : "#fff" }]}>
            Entendido, vamos lá!
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "80%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 18 },
  accentBar: { width: 4, borderRadius: 2, alignSelf: "stretch", minHeight: 36 },
  title: { fontSize: 18, fontFamily: fonts.serif.extra, lineHeight: 22 },
  subtitle: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 3, lineHeight: 17 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  itemsContainer: { gap: 2, paddingBottom: 16 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemTitle: { fontSize: 13, fontFamily: fonts.sans.bold, marginBottom: 2 },
  itemDesc: { fontSize: 12, fontFamily: fonts.sans.regular, lineHeight: 18 },
  cta: {
    height: 52,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  ctaText: { fontSize: 15, fontFamily: fonts.sans.bold },
});
