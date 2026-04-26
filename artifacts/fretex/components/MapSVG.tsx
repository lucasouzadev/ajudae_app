import React from "react";
import { View } from "react-native";
import Svg, { Rect, Ellipse, Line, Text as SvgText } from "react-native-svg";

export function MapSVG() {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%">
        <Rect width="100%" height="100%" fill="#EDE8DF" />
        <Rect x="4%" y="4%" width="24%" height="17%" rx={3} fill="#E0D9CE" />
        <Rect x="32%" y="4%" width="18%" height="14%" rx={3} fill="#E0D9CE" />
        <Rect x="54%" y="4%" width="20%" height="17%" rx={3} fill="#E0D9CE" />
        <Rect x="78%" y="4%" width="18%" height="14%" rx={3} fill="#E0D9CE" />
        <Rect x="4%" y="26%" width="12%" height="22%" rx={3} fill="#D4EBC8" opacity={0.85} />
        <Rect x="20%" y="26%" width="26%" height="20%" rx={3} fill="#E0D9CE" />
        <Rect x="50%" y="24%" width="22%" height="22%" rx={3} fill="#E0D9CE" />
        <Rect x="76%" y="24%" width="20%" height="18%" rx={3} fill="#D4EBC8" opacity={0.7} />
        <Rect x="4%" y="53%" width="20%" height="16%" rx={3} fill="#E0D9CE" />
        <Rect x="28%" y="51%" width="30%" height="18%" rx={3} fill="#E0D9CE" />
        <Rect x="62%" y="51%" width="16%" height="16%" rx={3} fill="#E0D9CE" />
        <Ellipse cx="28%" cy="82%" rx="26%" ry="12%" fill="#C8DFF0" opacity={0.55} />
        <Rect x="0" y="22%" width="100%" height="4%" fill="#F5F2EE" />
        <Rect x="0" y="46%" width="100%" height="4%" fill="#F5F2EE" />
        <Rect x="17%" y="0" width="3%" height="100%" fill="#F5F2EE" />
        <Rect x="48%" y="0" width="3%" height="100%" fill="#F5F2EE" />
        <Rect x="76%" y="0" width="3%" height="100%" fill="#F5F2EE" />
        <Line x1="0" y1="24%" x2="100%" y2="24%" stroke="#DDD8CE" strokeWidth={1} strokeDasharray="10,7" />
        <Line x1="0" y1="48%" x2="100%" y2="48%" stroke="#DDD8CE" strokeWidth={1} strokeDasharray="10,7" />
        <SvgText x="50%" y="21%" textAnchor="middle" fill="#C4BDB4" fontSize="9" fontFamily="Figtree_600SemiBold">AV. PRINCIPAL</SvgText>
        <SvgText x="50%" y="44.5%" textAnchor="middle" fill="#C4BDB4" fontSize="9" fontFamily="Figtree_600SemiBold">RUA DO FRETE</SvgText>
      </Svg>
    </View>
  );
}
