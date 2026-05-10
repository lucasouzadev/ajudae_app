import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useService } from "@/contexts/ServiceContext";
import { fonts } from "@/constants/colors";

const TAB_BG = "#1F1F1F";
const ACTIVE_COLOR = "#FFC90E";
const INACTIVE_COLOR = "rgba(255,255,255,0.4)";

type TabDef = {
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
};

const CLIENT_TABS: TabDef[] = [
  { route: "/", icon: "home-outline", iconActive: "home", label: "Início" },
  { route: "/marketplace", icon: "search-outline", iconActive: "search", label: "Buscar" },
  { route: "/inbox", icon: "chatbubble-outline", iconActive: "chatbubble", label: "Inbox" },
  { route: "/support", icon: "help-circle-outline", iconActive: "help-circle", label: "Ajuda" },
];

const PROVIDER_TABS: TabDef[] = [
  { route: "/", icon: "home-outline", iconActive: "home", label: "Início" },
  { route: "/proposals", icon: "list-outline", iconActive: "list", label: "Serviços" },
  { route: "/inbox", icon: "chatbubble-outline", iconActive: "chatbubble", label: "Inbox" },
  { route: "/portfolio", icon: "briefcase-outline", iconActive: "briefcase", label: "Portfólio" },
];

function TabItem({ tab, isActive }: { tab: TabDef; isActive: boolean }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive]);

  return (
    <Pressable
      onPress={() => router.push(tab.route as never)}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Ionicons
          name={isActive ? tab.iconActive : tab.icon}
          size={22}
          color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
        {isActive && (
          <Text style={styles.label}>{tab.label}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function BottomTabBar() {
  const { role, isAuthenticated } = useAuth();
  const { active } = useService();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!isAuthenticated || active) return null;

  const tabs = role === "prestador" ? PROVIDER_TABS : CLIENT_TABS;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: TAB_BG }]}>
      {tabs.map((tab) => (
        <TabItem key={tab.route} tab={tab} isActive={pathname === tab.route} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: 56,
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  tabInner: {
    alignItems: "center",
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: fonts.sans.semibold,
    color: ACTIVE_COLOR,
  },
});
