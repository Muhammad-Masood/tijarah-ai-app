/**
 * Backend base URL. `localhost` only reaches the host machine from web and
 * the iOS simulator — the Android emulator needs the special `10.0.2.2`
 * alias, and a physical device needs the host's LAN IP. Override with
 * EXPO_PUBLIC_API_URL (e.g. in a `.env` file) when running on a physical
 * device or against a non-local backend.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://192.168.100.6:8000";
