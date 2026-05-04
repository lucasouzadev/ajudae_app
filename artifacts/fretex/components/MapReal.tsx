import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { ProviderPin } from "./ProviderPin";
import type { Category } from "@/constants/mockData";

const isGoogle = process.env.EXPO_PUBLIC_MAP_PROVIDER === "google";
const MAP_PROVIDER = isGoogle ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

export interface MapPin {
  id: string;
  cat: Category;
  color: string;
  label: string;
  lat: number;
  lng: number;
  scheduled?: boolean;
}

export interface MapRealRef {
  recenter: () => Promise<void>;
  zoomOut: () => void;
  zoomIn: () => void;
}

interface MapRealProps {
  pins: MapPin[];
  activeId?: string | null;
  onPinPress: (id: string) => void;
}

const RIO_DEFAULT = {
  latitude: -22.9068,
  longitude: -43.1729,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

export const MapReal = forwardRef<MapRealRef, MapRealProps>(
  ({ pins, activeId, onPinPress }, ref) => {
    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState(RIO_DEFAULT);
    const regionRef = useRef(RIO_DEFAULT);

    useImperativeHandle(ref, () => ({
      recenter: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({});
        const newRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        };
        regionRef.current = newRegion;
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 600);
      },
      zoomOut: () => {
        const r = { ...regionRef.current, latitudeDelta: 0.22, longitudeDelta: 0.22 };
        mapRef.current?.animateToRegion(r, 500);
      },
      zoomIn: () => {
        const r = { ...regionRef.current, latitudeDelta: 0.07, longitudeDelta: 0.07 };
        mapRef.current?.animateToRegion(r, 500);
      },
    }));

    return (
      <MapView
        ref={mapRef}
        provider={MAP_PROVIDER}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {pins.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            tracksViewChanges={activeId === p.id}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => onPinPress(p.id)}
          >
            <ProviderPin
              category={p.cat}
              price={p.label}
              color={p.color}
              active={activeId === p.id}
            />
          </Marker>
        ))}
      </MapView>
    );
  }
);
