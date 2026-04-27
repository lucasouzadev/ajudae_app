import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";

interface TopNavProps {
  title: string;
  subtitle?: string;
  initials?: string;
  badge?: boolean;
  onMenuOpen?: () => void;
  onProfileOpen?: () => void;
  onBack?: () => void;
  accentColor?: string;
  /** Exibe ícone ℹ e chama este callback ao pressionar */
  onInfo?: () => void;
}

export function TopNav({ title, subtitle, initials, badge, onMenuOpen, onProfileOpen, onBack, accentColor, onInfo }: TopNavProps) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const accent = accentColor || c.primary;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: c.card,
          borderBottomColor: c.border,
        },
      ]}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={[styles.iconBtn, { backgroundColor: c.background, borderColor: c.border }, shadows.sm]}
        >
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onMenuOpen}
          style={[styles.iconBtn, { backgroundColor: c.background, borderColor: c.border }, shadows.sm]}
          accessibilityLabel="Abrir menu"
        >
          <Ionicons name="menu" size={20} color={c.text} />
        </Pressable>
      )}

      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.softMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Botão de info — aparece quando onInfo é passado */}
      {onInfo ? (
        <Pressable
          onPress={onInfo}
          style={[styles.iconBtn, { backgroundColor: c.background, borderColor: c.border }, shadows.sm]}
          accessibilityLabel="Informações desta tela"
        >
          <Ionicons name="information-circle-outline" size={20} color={c.sub} />
        </Pressable>
      ) : null}

      {initials ? (
        <Pressable onPress={onProfileOpen} accessibilityLabel="Abrir perfil">
          <LinearGradient
            colors={[accent, "#FF8C5A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.avatar, { borderColor: c.primaryMid }, shadows.sm]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          {badge ? (
            <View style={[styles.dot, { borderColor: c.card, backgroundColor: c.success }]} />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
    zIndex: 40,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 16,
    fontFamily: fonts.serif.extra,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: fonts.sans.regular,
    marginTop: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.serif.extra,
  },
  dot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
});
