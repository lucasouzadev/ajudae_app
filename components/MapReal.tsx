import React, { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
}

interface MapRealProps {
  pins: MapPin[];
  activeId?: string | null;
  onPinPress?: (id: string) => void;
  height?: number;
}

const RIO_COORDS = {
  latitude: -22.9068,
  longitude: -43.1729,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function MapReal({ pins, activeId, onPinPress, height = 260 }: MapRealProps) {
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={RIO_COORDS}
        showsUserLocation={true}
        showsMyLocationButton={false}
        zoomControlEnabled={false}
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            title={pin.label}
            pinColor={pin.color}
            onPress={() => onPinPress?.(pin.id)}
          />
        ))}
      </MapView>
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
    backgroundColor: "#f5f5f5",
  },
});
