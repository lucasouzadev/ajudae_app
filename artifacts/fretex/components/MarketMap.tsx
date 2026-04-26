import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import colors, { fonts, shadows } from "@/constants/colors";
import type { Category } from "@/constants/mockData";
import { MapSVG } from "./MapSVG";
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
}

export function MarketMap({ pins, activeId, onPinPress, title, subtitle, badgeColor, height = 260 }: MarketMapProps) {
  const c = colors.light;

  return (
    <View style={[styles.wrap, { backgroundColor: c.card, borderColor: c.border, height }, shadows.md]}>
      <MapSVG />

      {/* Soft top gradient overlay handled by header card */}
      <View style={[styles.headerCard, { backgroundColor: c.card, borderColor: c.borderLight }, shadows.sm]}>
        <View style={[styles.headerDot, { backgroundColor: badgeColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>{title}</Text>
          <Text style={[styles.headerSub, { color: c.softMuted }]}>{subtitle}</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: c.background, borderColor: c.borderLight }]}>
          <Text style={[styles.countTxt, { color: c.text }]}>{pins.length}</Text>
        </View>
      </View>

      {/* Pins */}
      {pins.map((p) => (
        <View
          key={p.id}
          pointerEvents="box-none"
          style={[
            styles.pinHolder,
            { left: `${p.lng - 8}%`, top: `${p.lat - 5}%` },
          ]}
        >
          <View style={{ alignItems: "center" }}>
            <ProviderPin
              category={p.cat}
              price={p.label}
              color={p.color}
              active={activeId === p.id}
              onPress={() => onPinPress(p.id)}
            />
            {p.scheduled ? (
              <View style={[styles.schedTag, { backgroundColor: c.card, borderColor: p.color }]}>
                <Ionicons name="calendar" size={8} color={p.color} />
                <Text style={[styles.schedTxt, { color: p.color }]}>agendado</Text>
              </View>
            ) : null}
          </View>
        </View>
      ))}

      {/* My location dot */}
      <View style={[styles.meDotOuter, { borderColor: badgeColor }]}>
        <View style={[styles.meDotInner, { backgroundColor: badgeColor }]} />
      </View>

      {/* Recenter button */}
      <Pressable style={[styles.recenter, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
        <MaterialCommunityIcons name="crosshairs-gps" size={16} color={c.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    marginBottom: 14,
  },
  headerCard: {
    position: "absolute",
    top: 12,
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
  pinHolder: {
    position: "absolute",
    width: 80,
    alignItems: "center",
  },
  schedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  schedTxt: { fontSize: 8, fontFamily: fonts.sans.bold, letterSpacing: 0.3 },
  meDotOuter: {
    position: "absolute",
    bottom: 18,
    right: 18,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  meDotInner: { width: 8, height: 8, borderRadius: 4 },
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
  },
});
