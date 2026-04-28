import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import colors, { fonts, shadows } from "@/constants/colors";
import type { Category } from "@/constants/mockData";
import { MapReal, MapRealRef } from "./MapReal";
import { ProviderPin } from "./ProviderPin";

export interface MapPin {
  id: string;
  cat: Category;
  color: string;
  label: string;
  lat: number;
  lng: number;
  scheduled?: boolean;
}

interface MarketMapProps {
  pins: MapPin[];
  activeId?: string | null;
  onPinPress: (id: string) => void;
  title: string;
  subtitle: string;
  badgeColor: string;
  height?: number;
  onExpand?: () => void;
  headerTop?: number;
}

export function MarketMap({
  pins,
  activeId,
  onPinPress,
  title,
  subtitle,
  badgeColor,
  height = 260,
  onExpand,
  headerTop = 12,
}: MarketMapProps) {
  const c = colors.light;
  const mapRef = useRef<MapRealRef>(null);

  return (
    <View
      style={[styles.wrap, { backgroundColor: c.card, borderColor: c.border, height }, shadows.md]}
    >
      <MapReal
        ref={mapRef}
        pins={pins}
        activeId={activeId}
        onPinPress={onPinPress}
      />

      {/* Dark gradient overlay at bottom */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.38)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Header card */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: c.card, borderColor: c.borderLight, top: headerTop },
          shadows.sm,
        ]}
      >
        <View style={[styles.headerDot, { backgroundColor: badgeColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>{title}</Text>
          <Text style={[styles.headerSub, { color: c.softMuted }]}>{subtitle}</Text>
        </View>
        <View
          style={[styles.countPill, { backgroundColor: c.background, borderColor: c.borderLight }]}
        >
          <Text style={[styles.countTxt, { color: c.text }]}>{pins.length}</Text>
        </View>
      </View>

      {/* Recenter button */}
      <Pressable
        style={[styles.recenter, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
        onPress={() => mapRef.current?.recenter()}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={16} color={c.text} />
      </Pressable>

      {/* Expand tap affordance */}
      {onExpand ? (
        <Pressable onPress={onExpand} style={styles.expandHint}>
          <View style={styles.expandPill}>
            <Ionicons name="expand-outline" size={13} color="#fff" />
            <Text style={styles.expandText}>Toque para explorar</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 10,
  },
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    zIndex: 2,
  },
  headerCard: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 5,
  },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  headerSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 1 },
  countPill: {
    minWidth: 28,
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countTxt: { fontSize: 12, fontFamily: fonts.sans.bold },
  recenter: {
    position: "absolute",
    right: 12,
    top: 80,
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  expandHint: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 6,
  },
  expandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  expandText: { fontSize: 11, fontFamily: fonts.sans.bold, color: "#fff" },
});
