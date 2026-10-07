import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store has no web implementation — fall back to localStorage
// there. Token storage only; nothing here should ever hold WhatsApp/JWT
// secrets beyond the session token itself.
const isWeb = Platform.OS === "web";

export const storage = {
  async getItem(key) {
    if (isWeb) return window.localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (isWeb) {
      window.localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    if (isWeb) {
      window.localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};
