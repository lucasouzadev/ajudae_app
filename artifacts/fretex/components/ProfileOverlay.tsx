import React, { useEffect, useRef } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Animated, ScrollView, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileOverlayProps {
  open: boolean;
  onClose: () => void;
  name: string;
  initials: string;
}

const ITEMS_BASE = [
  { icon: "card" as const, label: "Métodos de Pagamento", sub: "Pix · Cartão •••• 9768" },
  { icon: "location" as const, label: "Meus Endereços", sub: "Tijuca, Rio de Janeiro" },
  { icon: "list" as const, label: "Histórico de Pedidos", sub: "12 pedidos realizados" },
  { icon: "star" as const, label: "Avaliações", sub: "Média 4.9 de 5" },
  { icon: "lock-closed" as const, label: "Segurança", sub: "PIN e documentos" },
  { icon: "settings" as const, label: "Configurações", sub: "Notificações, privacidade" },
];

export function ProfileOverlay({ open, onClose, name, initials }: ProfileOverlayProps) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { role, switchRole, logout } = useAuth();
  const translateY = useRef(new Animated.Value(-1000)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 440, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -1000, duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [open, translateY, fade]);

  const accent = role === "cliente" ? c.primary : c.blue;
  const roleLabel = role === "cliente" ? "Cliente" : "Prestador";
  const otherRole = role === "cliente" ? "prestador" : "cliente";
  const otherLabel = otherRole === "cliente" ? "Cliente" : "Prestador";

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: c.card, transform: [{ translateY }] },
          shadows.xl,
        ]}
      >
        <View style={{ height: insets.top + 56 }} />

        <LinearGradient
          colors={[accent, c.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Olá,</Text>
              <Text style={styles.name}>{name}</Text>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>{roleLabel}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Fechar perfil">
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
          {ITEMS_BASE.map((item, i) => (
            <Pressable key={i} style={[styles.item, { borderBottomColor: c.borderLight }]}>
              <View style={[styles.itemIcon, { backgroundColor: c.background }]}>
                <Ionicons name={item.icon} size={18} color={c.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemLabel, { color: c.text }]}>{item.label}</Text>
                <Text style={[styles.itemSub, { color: c.softMuted }]}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.softMuted} />
            </Pressable>
          ))}

          <Pressable
            onPress={() => {
              switchRole(otherRole as "cliente" | "prestador");
              onClose();
            }}
            style={[styles.item, { borderBottomColor: c.borderLight }]}
          >
            <View style={[styles.itemIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="swap-horizontal" size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: c.text }]}>Trocar para {otherLabel}</Text>
              <Text style={[styles.itemSub, { color: c.softMuted }]}>Mude o tipo de conta</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.softMuted} />
          </Pressable>

          <Pressable
            onPress={async () => {
              await logout();
              onClose();
            }}
            style={[styles.logoutBtn, { borderColor: c.border }]}
          >
            <Text style={[styles.logoutText, { color: c.sub }]}>Sair da conta</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "93%",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  hero: { padding: 24, paddingBottom: 28 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarText: {
    color: "#fff",
    fontSize: 24,
    fontFamily: fonts.serif.extra,
  },
  greeting: { color: "rgba(255,255,255,0.78)", fontSize: 12, fontFamily: fonts.sans.regular },
  name: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra, lineHeight: 26 },
  roleChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 6,
  },
  roleChipText: { color: "#fff", fontSize: 10, fontFamily: fonts.sans.bold },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 24, paddingBottom: 40 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: { fontSize: 14, fontFamily: fonts.sans.semibold },
  itemSub: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 1 },
  logoutBtn: {
    height: 48,
    marginTop: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { fontSize: 14, fontFamily: fonts.sans.semibold },
});
