import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Animated, ScrollView, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

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

function SubMenuContent({ label, c }: { label: string; c: ReturnType<typeof Object.assign> }) {
  if (label === "Métodos de Pagamento") {
    return (
      <View style={subStyles.container}>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: `${c.success}18` }]}>
            <Ionicons name="qr-code" size={18} color={c.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Pix</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Chave: •••• 9768</Text>
          </View>
          <View style={[subStyles.badge, { backgroundColor: `${c.success}18` }]}>
            <Text style={[subStyles.badgeText, { color: c.success }]}>Ativo</Text>
          </View>
        </View>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: `${c.blue}18` }]}>
            <Ionicons name="card" size={18} color={c.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Cartão Crédito</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Visa •••• 4521</Text>
          </View>
          <View style={[subStyles.badge, { backgroundColor: `${c.success}18` }]}>
            <Text style={[subStyles.badgeText, { color: c.success }]}>Ativo</Text>
          </View>
        </View>
        <Pressable style={[subStyles.addBtn, { borderColor: c.border }]} disabled>
          <Ionicons name="add" size={15} color={c.softMuted} />
          <Text style={[subStyles.addBtnText, { color: c.softMuted }]}>Adicionar método</Text>
        </Pressable>
      </View>
    );
  }

  if (label === "Meus Endereços") {
    return (
      <View style={subStyles.container}>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: `${c.primary}18` }]}>
            <Ionicons name="home" size={18} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Casa</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Tijuca, Rio de Janeiro, RJ</Text>
          </View>
        </View>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: `${c.blue}18` }]}>
            <Ionicons name="business" size={18} color={c.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Trabalho</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Centro, Rio de Janeiro, RJ</Text>
          </View>
        </View>
        <Pressable style={[subStyles.addBtn, { borderColor: c.border }]} disabled>
          <Ionicons name="add" size={15} color={c.softMuted} />
          <Text style={[subStyles.addBtnText, { color: c.softMuted }]}>Adicionar endereço</Text>
        </Pressable>
      </View>
    );
  }

  if (label === "Histórico de Pedidos") {
    const orders = [
      { icon: "home" as const, cat: "Mudança", route: "Tijuca → Centro", price: "R$420", status: "Concluído", when: "há 2 dias", color: c.success },
      { icon: "car" as const, cat: "Frete", route: "Barra → Recreio", price: "R$90", status: "Concluído", when: "há 1 semana", color: c.success },
      { icon: "cube" as const, cat: "Entrega", route: "Botafogo → Humaitá", price: "R$45", status: "Cancelado", when: "há 2 semanas", color: "#E53E3E" },
      { icon: "home" as const, cat: "Mudança", route: "Méier → Tijuca", price: "R$165", status: "Concluído", when: "há 1 mês", color: c.success },
    ];
    return (
      <View style={subStyles.container}>
        {orders.map((o, i) => (
          <View key={i} style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={[subStyles.iconBox, { backgroundColor: `${o.color}18` }]}>
              <Ionicons name={o.icon} size={18} color={o.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[subStyles.rowLabel, { color: c.text }]}>{o.cat} · {o.price}</Text>
              <Text style={[subStyles.rowSub, { color: c.softMuted }]}>{o.route} · {o.when}</Text>
            </View>
            <View style={[subStyles.badge, { backgroundColor: `${o.color}18` }]}>
              <Text style={[subStyles.badgeText, { color: o.color }]}>{o.status}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (label === "Avaliações") {
    const reviews = [
      { author: "Carlos O.", rating: 5, text: "Pontual e muito cuidadoso com os móveis. Super recomendo!", when: "há 3 dias" },
      { author: "Marcos F.", rating: 5, text: "Serviço impecável, comunicação excelente durante todo o processo.", when: "há 1 semana" },
      { author: "Rafael C.", rating: 4, text: "Bom profissional, chegou no horário combinado.", when: "há 2 semanas" },
    ];
    return (
      <View style={subStyles.container}>
        <View style={[subStyles.ratingHeader, { backgroundColor: c.background, borderColor: c.border }]}>
          <Text style={[subStyles.ratingBig, { color: c.warning }]}>4.9</Text>
          <View>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[1,2,3,4,5].map((i) => <Ionicons key={i} name="star" size={16} color={c.warning} />)}
            </View>
            <Text style={[subStyles.rowSub, { color: c.softMuted, marginTop: 4 }]}>Baseado em 12 avaliações</Text>
          </View>
        </View>
        {reviews.map((r, i) => (
          <View key={i} style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border, flexDirection: "column", alignItems: "flex-start", gap: 6 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
              <Text style={[subStyles.rowLabel, { color: c.text }]}>{r.author}</Text>
              <Text style={[subStyles.rowSub, { color: c.softMuted }]}>{r.when}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 2 }}>
              {Array.from({ length: r.rating }).map((_, k) => <Ionicons key={k} name="star" size={12} color={c.warning} />)}
            </View>
            <Text style={[subStyles.rowSub, { color: c.sub }]}>{r.text}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (label === "Segurança") {
    return (
      <View style={subStyles.container}>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: `${c.success}18` }]}>
            <Ionicons name="checkmark-shield" size={18} color={c.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>PIN de segurança</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Configurado · 4 dígitos</Text>
          </View>
          <View style={[subStyles.badge, { backgroundColor: `${c.success}18` }]}>
            <Text style={[subStyles.badgeText, { color: c.success }]}>Ativo</Text>
          </View>
        </View>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: `${c.blue}18` }]}>
            <Ionicons name="phone-portrait" size={18} color={c.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Verificação em 2 etapas</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Via SMS · •••• 9821</Text>
          </View>
          <View style={[subStyles.badge, { backgroundColor: `${c.success}18` }]}>
            <Text style={[subStyles.badgeText, { color: c.success }]}>Ativo</Text>
          </View>
        </View>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: "#6B728018" }]}>
            <Ionicons name="document-text" size={18} color="#6B7280" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>CPF verificado</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>•••.•••.123-45</Text>
          </View>
          <View style={[subStyles.badge, { backgroundColor: `${c.success}18` }]}>
            <Text style={[subStyles.badgeText, { color: c.success }]}>Verificado</Text>
          </View>
        </View>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: "#9333EA18" }]}>
            <Ionicons name="finger-print" size={18} color="#9333EA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Biometria</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Face ID / Touch ID</Text>
          </View>
          <View style={[subStyles.badge, { backgroundColor: "#9333EA18" }]}>
            <Text style={[subStyles.badgeText, { color: "#9333EA" }]}>Ativo</Text>
          </View>
        </View>
      </View>
    );
  }

  if (label === "Configurações") {
    const { notifications, location, requestNotifications, requestLocation, openSettings } = usePermissions();

    // Build a row descriptor for each OS permission toggle
    type PermRow = {
      icon: React.ComponentProps<typeof Ionicons>["name"];
      label: string;
      sub: string;
      granted: boolean;
      canAsk: boolean;
      onRequest: () => void;
    };

    const permRows: PermRow[] = [
      {
        icon: "notifications",
        label: "Notificações de pedidos",
        sub: notifications.granted ? "Ativas" : notifications.canAsk ? "Toque para ativar" : "Abrir Configurações",
        granted: notifications.granted,
        canAsk: notifications.canAsk,
        onRequest: notifications.canAsk ? requestNotifications : openSettings,
      },
      {
        icon: "location",
        label: "Localização em segundo plano",
        sub: location.granted ? "Ativa" : location.canAsk ? "Toque para ativar" : "Abrir Configurações",
        granted: location.granted,
        canAsk: location.canAsk,
        onRequest: location.canAsk ? requestLocation : openSettings,
      },
    ];

    const staticRows = [
      { icon: "moon" as const, label: "Modo escuro", sub: "Seguir tema do sistema", on: false },
      { icon: "language" as const, label: "Idioma", sub: "Português (Brasil)", on: null as boolean | null },
    ];

    return (
      <View style={subStyles.container}>
        {/* Permission-backed toggles */}
        {permRows.map((item, i) => (
          <Pressable key={i} onPress={() => item.onRequest()} style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={[subStyles.iconBox, { backgroundColor: c.card }]}>
              <Ionicons name={item.icon} size={18} color={item.granted ? c.success : c.sub} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[subStyles.rowLabel, { color: c.text }]}>{item.label}</Text>
              <Text style={[subStyles.rowSub, { color: item.granted ? c.success : item.canAsk ? c.softMuted : "#F97316" }]}>
                {item.sub}
              </Text>
            </View>
            {!item.canAsk && !item.granted ? (
              <Ionicons name="open-outline" size={16} color="#F97316" />
            ) : (
              <View style={[subStyles.miniSwitch, { backgroundColor: item.granted ? c.success : "#D4D0CB" }]}>
                <View style={[subStyles.miniDot, { left: item.granted ? 14 : 2 }]} />
              </View>
            )}
          </Pressable>
        ))}

        {/* Static preference rows */}
        {staticRows.map((item, i) => (
          <View key={i} style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={[subStyles.iconBox, { backgroundColor: c.card }]}>
              <Ionicons name={item.icon} size={18} color={c.sub} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[subStyles.rowLabel, { color: c.text }]}>{item.label}</Text>
              <Text style={[subStyles.rowSub, { color: c.softMuted }]}>{item.sub}</Text>
            </View>
            {item.on !== null ? (
              <View style={[subStyles.miniSwitch, { backgroundColor: item.on ? c.success : "#D4D0CB" }]}>
                <View style={[subStyles.miniDot, { left: item.on ? 14 : 2 }]} />
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={16} color={c.softMuted} />
            )}
          </View>
        ))}
        <View style={[subStyles.row, { backgroundColor: "#FEF2F218", borderColor: "#E5373718" }]}>
          <View style={[subStyles.iconBox, { backgroundColor: "#E5373718" }]}>
            <Ionicons name="trash" size={18} color="#E53737" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: "#E53737" }]}>Excluir conta</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Ação irreversível</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={subStyles.container}>
      <View style={[subStyles.comingSoon, { backgroundColor: c.background, borderColor: c.border }]}>
        <Ionicons name="time-outline" size={28} color={c.softMuted} />
        <Text style={[subStyles.comingSoonText, { color: c.softMuted }]}>Em breve</Text>
      </View>
    </View>
  );
}

export function ProfileOverlay({ open, onClose, name, initials }: ProfileOverlayProps) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { role, logout } = useAuth();
  const translateY = useRef(new Animated.Value(-1000)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 440, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();
    } else {
      setActiveMenu(null);
      Animated.parallel([
        Animated.timing(translateY, { toValue: -1000, duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [open, translateY, fade]);

  const accent = role === "cliente" ? c.primary : c.blue;
  const roleLabel = role === "cliente" ? "Cliente" : "Prestador";

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
        <LinearGradient
          colors={[accent, c.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}
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
          {activeMenu !== null ? (
            <>
              <Pressable
                onPress={() => setActiveMenu(null)}
                style={[styles.backBtn, { borderBottomColor: c.borderLight }]}
              >
                <Ionicons name="arrow-back" size={18} color={c.text} />
                <Text style={[styles.backBtnText, { color: c.text }]}>{activeMenu}</Text>
              </Pressable>
              <SubMenuContent label={activeMenu} c={c} />
            </>
          ) : (
            <>
              {ITEMS_BASE.map((item, i) => (
                <Pressable key={i} onPress={() => setActiveMenu(item.label)} style={[styles.item, { borderBottomColor: c.borderLight }]}>
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
                onPress={async () => {
                  await logout();
                  onClose();
                }}
                style={[styles.logoutBtn, { borderColor: c.border }]}
              >
                <Text style={[styles.logoutText, { color: c.sub }]}>Sair da conta</Text>
              </Pressable>
            </>
          )}
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
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  backBtnText: { fontSize: 16, fontFamily: fonts.sans.bold },
});

const subStyles = StyleSheet.create({
  container: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 13, fontFamily: fonts.sans.semibold },
  rowSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontFamily: fonts.sans.bold },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    opacity: 0.5,
  },
  addBtnText: { fontSize: 13, fontFamily: fonts.sans.semibold },
  comingSoon: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  comingSoonText: { fontSize: 14, fontFamily: fonts.sans.semibold },
  ratingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 2,
  },
  ratingBig: { fontSize: 36, fontFamily: fonts.sans.bold },
  miniSwitch: { width: 36, height: 20, borderRadius: 10, position: "relative" },
  miniDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#fff", position: "absolute", top: 3 },
});
