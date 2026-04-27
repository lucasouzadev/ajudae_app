import Constants from "expo-constants";

// APP_ENV=demo enables demo mode (credential hints, mock data hints, etc.)
// In development (__DEV__), demo mode is always on.
const appEnv = Constants.expoConfig?.extra?.appEnv ?? (typeof __DEV__ !== "undefined" && __DEV__ ? "demo" : "production");

export const IS_DEMO = appEnv === "demo";
