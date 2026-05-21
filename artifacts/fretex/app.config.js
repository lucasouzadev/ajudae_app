const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    name: "Ajudaê!",
    slug: "ajuda",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "ajuda",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/58679028-d339-4d8d-9fde-bd7dd1ad7725",
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#FFC90E",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.ajuda.app",
      config: googleMapsApiKey ? { googleMapsApiKey } : undefined,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.ajuda.app",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#FFC90E",
      },
      config: googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : undefined,
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      "expo-notifications",
      "expo-updates",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: "58679028-d339-4d8d-9fde-bd7dd1ad7725",
      },
    },
    owner: "juiceluqi",
  },
};
