const palette = {
  primary: "#FFCC00",
  primaryLight: "#FFFBE0",
  primaryMid: "#FFE566",
  primaryDeep: "#E8B400",

  bg: "#F8F5EC",
  bgDeep: "#EDE8DA",
  white: "#FFFFFF",

  text: "#1A1714",
  sub: "#6B6259",
  muted: "#A39B90",

  border: "#E8E3D8",
  borderLight: "#F0EDE4",

  success: "#16A34A",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  blue: "#2563EB",
  blueLight: "#DBEAFE",
  purple: "#9333EA",
};

const colors = {
  light: {
    text: palette.text,
    tint: palette.primary,

    background: palette.bg,
    foreground: palette.text,

    card: palette.white,
    cardForeground: palette.text,

    primary: palette.primary,
    primaryForeground: palette.white,

    secondary: palette.primaryLight,
    secondaryForeground: palette.primary,

    muted: palette.borderLight,
    mutedForeground: palette.sub,

    accent: palette.text,
    accentForeground: palette.white,

    destructive: "#E11D48",
    destructiveForeground: palette.white,

    success: palette.success,
    successForeground: palette.white,
    successLight: palette.successLight,

    warning: palette.warning,
    warningForeground: palette.white,
    warningLight: palette.warningLight,

    blue: palette.blue,
    blueLight: palette.blueLight,
    purple: palette.purple,

    border: palette.border,
    borderLight: palette.borderLight,
    input: palette.border,

    surface: palette.bg,
    surfaceElevated: palette.white,
    overlay: "rgba(28,25,23,0.45)",

    sub: palette.sub,
    softMuted: palette.muted,
    primaryLight: palette.primaryLight,
    primaryMid: palette.primaryMid,
    primaryDeep: palette.primaryDeep,
    bgDeep: palette.bgDeep,
  },

  dark: {
    text: "#FAFAF9",
    tint: "#FF7A33",

    background: "#1C1917",
    foreground: "#FAFAF9",

    card: "#28231F",
    cardForeground: "#FAFAF9",

    primary: "#FF7A33",
    primaryForeground: "#1C1917",

    secondary: "#3A2A22",
    secondaryForeground: "#FFB585",

    muted: "#2A2522",
    mutedForeground: "#A8A29E",

    accent: "#FAFAF9",
    accentForeground: "#1C1917",

    destructive: "#F43F5E",
    destructiveForeground: "#FFFFFF",

    success: "#22C55E",
    successForeground: "#1C1917",
    successLight: "#14532D",

    warning: "#FBBF24",
    warningForeground: "#1C1917",
    warningLight: "#451A03",

    blue: "#3B82F6",
    blueLight: "#1E3A8A",
    purple: "#A855F7",

    border: "#3A332E",
    borderLight: "#2D2724",
    input: "#3A332E",

    surface: "#221E1B",
    surfaceElevated: "#28231F",
    overlay: "rgba(0,0,0,0.6)",

    sub: "#A8A29E",
    softMuted: "#78716C",
    primaryLight: "#3A2A22",
    primaryMid: "#5A3220",
    primaryDeep: "#FFA070",
    bgDeep: "#0F0D0C",
  },

  radius: 16,
};

export const fonts = {
  serif: {
    bold: "Fraunces_700Bold",
    extra: "Fraunces_800ExtraBold",
    black: "Fraunces_900Black",
  },
  sans: {
    regular: "Figtree_400Regular",
    medium: "Figtree_500Medium",
    semibold: "Figtree_600SemiBold",
    bold: "Figtree_700Bold",
    extra: "Figtree_800ExtraBold",
  },
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 48,
    elevation: 14,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 64,
    elevation: 22,
  },
};

export default colors;
