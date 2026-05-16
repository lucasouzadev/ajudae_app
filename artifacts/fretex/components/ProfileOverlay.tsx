import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, View, Text, Pressable, StyleSheet, Animated, ScrollView, Easing, Share } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useNotification } from "@/contexts/NotificationContext";

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
  { icon: "gift" as const, label: "Indicar amigos", sub: "Ganhe créditos por indicação" },
  { icon: "lock-closed" as const, label: "Segurança", sub: "PIN e documentos" },
  { icon: "settings" as const, label: "Configurações", sub: "Notificações, privacidade" },
];

function genReferralCode(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) >>> 0;
  }
  return `AJD${hash.toString(36).toUpperCase().slice(0, 5)}`;
}

function SubMenuContent({ label, c }: { label: string; c: ReturnType<typeof Object.assign> }) {
  const { user, deleteAccount } = useAuth();
  const {
    notifications,
    backgroundLocation,
    backgroundTrackingEnabled,
    themeMode,
    appLanguage,
    notificationPreferences,
    setBackgroundTrackingEnabled,
    toggleThemeMode,
    setAppLanguage,
    setNotificationPreference,
    resetPermissionSettings,
    openSettings,
    refresh,
  } = usePermissions();
  const {
    pushToken,
    isRegisteringPushToken,
    pushRegistrationError,
    refreshPushToken,
    requestPermission,
  } = useNotification();
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [settingsAccordion, setSettingsAccordion] = useState<"notifications" | null>(null);

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

  if (label === "Indicar amigos") {
    const code = genReferralCode(user?.id ?? "ajudae");
    const shareText = `Olá! Uso o Ajudaê para fretes e mudanças. Baixe agora e use meu código *${code}* para ganhar desconto no primeiro serviço! 🚚`;
    return (
      <View style={subStyles.container}>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border, flexDirection: "column", alignItems: "flex-start", gap: 10 }]}>
          <Text style={[subStyles.rowLabel, { color: c.text }]}>Seu código de indicação</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 26, fontFamily: fonts.sans.bold, color: c.text, letterSpacing: 2 }}>{code}</Text>
          </View>
          <Text style={[subStyles.rowSub, { color: c.softMuted }]}>
            Cada amigo que usar seu código te gera R$ 10 de crédito no próximo serviço.
          </Text>
        </View>
        <Pressable
          onPress={() =>
            Share.share({ message: shareText }).catch(() => {})
          }
          style={[subStyles.row, { backgroundColor: `${c.success}12`, borderColor: `${c.success}30` }]}
        >
          <View style={[subStyles.iconBox, { backgroundColor: `${c.success}18` }]}>
            <Ionicons name="share-social" size={18} color={c.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Compartilhar código</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>WhatsApp, Instagram, SMS…</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.success} />
        </Pressable>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: `${c.warning}18` }]}>
            <Ionicons name="people" size={18} color={c.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Amigos indicados</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>0 amigos · R$ 0 em créditos</Text>
          </View>
        </View>
      </View>
    );
  }

  if (label === "Segurança") {
    return (
      <View style={subStyles.container}>
        <View style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[subStyles.iconBox, { backgroundColor: `${c.success}18` }]}>
            <Ionicons name="shield-checkmark" size={18} color={c.success} />
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
          <View style={[subStyles.iconBox, { backgroundColor: `${c.success}18` }]}>
            <Ionicons name="finger-print" size={18} color={c.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Biometria</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Face ID / Touch ID</Text>
          </View>
          <View style={[subStyles.badge, { backgroundColor: `${c.success}18` }]}>
            <Text style={[subStyles.badgeText, { color: c.success }]}>Ativo</Text>
          </View>
        </View>
      </View>
    );
  }

  if (label === "Configurações") {
    const languageOptions = [
      { value: "pt-BR" as const, label: "PT" },
      { value: "en-US" as const, label: "EN" },
      { value: "es-ES" as const, label: "ES" },
    ];

    const languageLabel =
      appLanguage === "en-US"
        ? "English"
        : appLanguage === "es-ES"
          ? "Español"
          : "Português (Brasil)";

    const deviceNotificationLabel = notifications.granted
      ? isRegisteringPushToken
        ? "Sincronizando dispositivo"
        : pushToken
          ? "Ativo e sincronizado"
          : "Ativo no aparelho"
      : notifications.canAsk
        ? "Toque para ativar"
        : "Abrir ajustes do aparelho";

    const handleNotificationCategoryToggle = async (
      key: keyof typeof notificationPreferences,
      nextValue: boolean,
    ) => {
      await setNotificationPreference(key, nextValue);
    };

    const syncNotificationDevice = async () => {
      const snapshot = await refresh();

      if (snapshot.notifications.granted) {
        await refreshPushToken();
        await refresh();
        return;
      }

      if (snapshot.notifications.canAsk) {
        const granted = await requestPermission();
        await refresh();
        if (granted) {
          await refreshPushToken();
          await refresh();
        }
        return;
      }

      openSettings();
    };

    const renderTogglePill = (enabled: boolean, _activeColor: string) => (
      <Ionicons
        name={enabled ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={enabled ? c.success : c.softMuted}
      />
    );

    const notificationRows: Array<{
      key: keyof typeof notificationPreferences;
      icon: React.ComponentProps<typeof Ionicons>["name"];
      label: string;
      sub: string;
    }> = [
      {
        key: "orders" as const,
        icon: "cube",
        label: "Notificações de pedidos",
        sub: "Novos pedidos, aceite, rota e conclusão",
      },
      {
        key: "messages" as const,
        icon: "chatbubble-ellipses",
        label: "Mensagens e chat",
        sub: "Conversas com clientes e prestadores",
      },
      {
        key: "payments" as const,
        icon: "card",
        label: "Pagamentos e saques",
        sub: "Autorizações, cobranças e repasses",
      },
      {
        key: "account" as const,
        icon: "shield-checkmark",
        label: "Conta e segurança",
        sub: "Verificações, PIN e alertas importantes",
      },
      {
        key: "marketing" as const,
        icon: "megaphone",
        label: "Novidades e ofertas",
        sub: "Campanhas, promoções e avisos comerciais",
      },
    ];

    return (
      <View style={subStyles.container}>
        <Text style={[subStyles.sectionLabel, { color: c.softMuted }]}>Push</Text>

        <View style={[subStyles.accordionCard, { backgroundColor: c.background, borderColor: c.border }]}>
          <Pressable
            onPress={() => {
              setSettingsAccordion((current) =>
                current === "notifications" ? null : "notifications",
              );
            }}
            style={subStyles.accordionHeader}
          >
            <View style={[subStyles.iconBox, { backgroundColor: c.card }]}>
              <Ionicons
                name="notifications"
                size={18}
                color={notifications.granted ? c.success : c.sub}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[subStyles.rowLabel, { color: c.text }]}>Central de notificações</Text>
              <Text style={[subStyles.rowSub, { color: c.softMuted }]}>
                Permissão do aparelho, categorias e redefinição
              </Text>
            </View>
            <Ionicons
              name={settingsAccordion === "notifications" ? "chevron-up" : "chevron-down"}
              size={16}
              color={c.softMuted}
            />
          </Pressable>

          {settingsAccordion === "notifications" ? (
            <View style={subStyles.accordionBody}>
              <Pressable
                onPress={() => {
                  syncNotificationDevice();
                }}
                style={[subStyles.row, { backgroundColor: c.card, borderColor: c.border }]}
              >
                <View style={[subStyles.iconBox, { backgroundColor: c.background }]}>
                  <Ionicons
                    name="phone-portrait"
                    size={18}
                    color={notifications.granted ? c.success : c.sub}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[subStyles.rowLabel, { color: c.text }]}>Permissão do aparelho</Text>
                  <Text
                    style={[
                      subStyles.rowSub,
                      {
                        color: notifications.granted
                          ? c.success
                          : notifications.canAsk
                            ? c.softMuted
                            : "#F97316",
                      },
                    ]}
                  >
                    {deviceNotificationLabel}
                  </Text>
                  {pushRegistrationError ? (
                    <Text style={[subStyles.inlineHint, { color: "#F97316" }]}>
                      {pushRegistrationError}
                    </Text>
                  ) : null}
                </View>
                {notifications.granted ? (
                  <View style={[subStyles.badge, { backgroundColor: `${c.success}18` }]}>
                    <Text style={[subStyles.badgeText, { color: c.success }]}>Sistema</Text>
                  </View>
                ) : (
                  <Ionicons
                    name={notifications.canAsk ? "chevron-forward" : "open-outline"}
                    size={16}
                    color={notifications.canAsk ? c.softMuted : "#F97316"}
                  />
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  syncNotificationDevice();
                }}
                style={[subStyles.compactRow, { borderColor: c.border }]}
              >
                <Ionicons name="sync" size={16} color={c.sub} />
                <Text style={[subStyles.compactRowText, { color: c.text }]}>
                  {notifications.granted
                    ? isRegisteringPushToken
                      ? "Sincronizando dispositivo"
                      : pushToken
                        ? "Dispositivo sincronizado"
                        : "Sincronizar dispositivo"
                    : notifications.canAsk
                      ? "Ativar push no aparelho"
                      : "Revisar permissões no aparelho"}
                </Text>
              </Pressable>

              {notificationRows.map((item) => {
                const enabled = notificationPreferences[item.key];
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      handleNotificationCategoryToggle(item.key, !enabled);
                    }}
                    style={[subStyles.row, { backgroundColor: c.card, borderColor: c.border }]}
                  >
                    <View style={[subStyles.iconBox, { backgroundColor: c.background }]}>
                      <Ionicons name={item.icon} size={18} color={enabled ? c.primaryDeep : c.sub} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[subStyles.rowLabel, { color: c.text }]}>{item.label}</Text>
                      <Text style={[subStyles.rowSub, { color: enabled ? c.sub : c.softMuted }]}>
                        {item.sub}
                      </Text>
                    </View>
                    {renderTogglePill(enabled, c.success)}
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => {
                  resetPermissionSettings();
                }}
                style={[subStyles.compactRow, { borderColor: c.border }]}
              >
                <Ionicons name="refresh" size={16} color={c.sub} />
                <Text style={[subStyles.compactRowText, { color: c.text }]}>
                  Redefinir permissões do app
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <Text style={[subStyles.sectionLabel, { color: c.softMuted }]}>Privacidade</Text>

        <Pressable
          onPress={() => {
            setBackgroundTrackingEnabled(!backgroundTrackingEnabled);
          }}
          style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}
        >
          <View style={[subStyles.iconBox, { backgroundColor: c.card }]}>
            <Ionicons name="navigate" size={18} color={backgroundTrackingEnabled ? c.blue : c.sub} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Localização em segundo plano</Text>
            <Text style={[subStyles.rowSub, { color: backgroundTrackingEnabled ? c.blue : backgroundLocation.canAsk ? c.softMuted : "#F97316" }]}>
              {backgroundTrackingEnabled
                ? "Ativa para rastreamento fora da tela"
                : backgroundLocation.canAsk || backgroundLocation.granted
                  ? "Desligada"
                  : "Abrir ajustes do aparelho"}
            </Text>
          </View>
          {(!backgroundLocation.canAsk && !backgroundLocation.granted && !backgroundTrackingEnabled) ? (
            <Ionicons name="open-outline" size={16} color="#F97316" />
          ) : (
            renderTogglePill(backgroundTrackingEnabled, c.blue)
          )}
        </Pressable>

        <Text style={[subStyles.sectionLabel, { color: c.softMuted }]}>Aparência</Text>

        <Pressable
          onPress={() => {
            toggleThemeMode();
          }}
          style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}
        >
          <View style={[subStyles.iconBox, { backgroundColor: c.card }]}>
            <Ionicons name={themeMode === "dark" ? "moon" : "sunny"} size={18} color={themeMode === "dark" ? c.warning : c.primaryDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Modo Escuro</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>
              {themeMode === "dark" ? "Ativado" : "Desativado"}
            </Text>
          </View>
          {renderTogglePill(themeMode === "dark", c.primaryDeep)}
        </Pressable>

        <View style={[subStyles.rowBlock, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={subStyles.rowBlockHeader}>
            <View style={[subStyles.iconBox, { backgroundColor: c.card }]}>
              <Ionicons name="language" size={18} color={c.sub} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[subStyles.rowLabel, { color: c.text }]}>Idioma</Text>
              <Text style={[subStyles.rowSub, { color: c.softMuted }]}>{languageLabel}</Text>
            </View>
          </View>
          <View style={subStyles.optionRow}>
            {languageOptions.map((item) => {
              const active = item.value === appLanguage;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    setAppLanguage(item.value);
                  }}
                  style={[
                    subStyles.languageChip,
                    {
                      backgroundColor: active ? c.text : c.card,
                      borderColor: active ? c.text : c.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      subStyles.languageChipText,
                      { color: active ? c.background : c.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[subStyles.sectionLabel, { color: c.softMuted }]}>Conta</Text>

        <Pressable
          onPress={() => setShowDangerZone((value) => !value)}
          style={[subStyles.row, { backgroundColor: c.background, borderColor: c.border }]}
        >
          <View style={[subStyles.iconBox, { backgroundColor: c.card }]}>
            <Ionicons name="lock-closed" size={18} color={c.sub} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[subStyles.rowLabel, { color: c.text }]}>Privacidade e dados</Text>
            <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Ações sensíveis da conta</Text>
          </View>
          <Ionicons name={showDangerZone ? "chevron-up" : "chevron-down"} size={16} color={c.softMuted} />
        </Pressable>

        {showDangerZone ? (
          <View style={[subStyles.dangerZone, { borderColor: "#E5373718", backgroundColor: "#FEF2F218" }]}>
            <Pressable
              style={[subStyles.row, { backgroundColor: "transparent", borderColor: "transparent", paddingHorizontal: 0, paddingVertical: 0 }]}
              onPress={() => {
                Alert.alert(
                  "Excluir conta",
                  "Todos os seus dados serão anonimizados conforme a LGPD (Art. 18). Esta ação é irreversível.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Excluir",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await deleteAccount();
                        } catch (e) {
                          Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível excluir a conta.");
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <View style={[subStyles.iconBox, { backgroundColor: "#E5373718" }]}>
                <Ionicons name="trash" size={18} color="#E53737" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[subStyles.rowLabel, { color: "#E53737" }]}>Excluir conta</Text>
                <Text style={[subStyles.rowSub, { color: c.softMuted }]}>Anonimiza dados (LGPD Art. 18)</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#E53737" />
            </Pressable>
          </View>
        ) : null}
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
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      translateY.stopAnimation();
      fade.stopAnimation();
      translateY.setValue(-1000);
      fade.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 440, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
          Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
        ]).start();
      });
      return;
    }

    if (!mounted) return;

    translateY.stopAnimation();
    fade.stopAnimation();
    Animated.parallel([
      Animated.timing(translateY, { toValue: -1000, duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => {
      setActiveMenu(null);
      setMounted(false);
    });
  }, [open, mounted, translateY, fade]);

  const accent = role === "cliente" ? c.primary : c.blue;
  const roleLabel = role === "cliente" ? "Cliente" : "Prestador";

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
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
                  onClose();
                  await logout();
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
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.sans.bold,
    letterSpacing: 0.4,
    marginTop: 6,
    marginBottom: 2,
    textTransform: "uppercase",
  },
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
  inlineHint: { fontSize: 10, fontFamily: fonts.sans.medium, marginTop: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontFamily: fonts.sans.bold },
  accordionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  accordionBody: {
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactRowText: { fontSize: 12, fontFamily: fonts.sans.semibold },
  rowBlock: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rowBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  languageChip: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  languageChipText: { fontSize: 12, fontFamily: fonts.sans.bold },
  dangerZone: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
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
  togglePill: {
    minWidth: 98,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
  },
  toggleTrack: {
    width: 32,
    height: 18,
    borderRadius: 9,
    position: "relative",
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    position: "absolute",
    top: 2,
  },
  toggleLabel: {
    fontSize: 11,
    fontFamily: fonts.sans.bold,
  },
});
