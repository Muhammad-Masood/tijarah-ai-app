import { Platform } from "react-native";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  (Platform.OS === "android"
    ? "http://192.168.100.6:8000"
    : "http://192.168.100.6:8000")
