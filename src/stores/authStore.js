import { create } from "zustand";
import { api, setAuthToken, registerUnauthorizedHandler } from "../api/client";
import { storage } from "../lib/storage";

const TOKEN_KEY = "rms_token";
const USER_KEY = "rms_user";

// status: "idle" (before hydrate runs) | "loading" | "authenticated" | "unauthenticated"
export const useAuthStore = create((set, get) => ({
  status: "idle",
  user: null,
  token: null,
  error: null,

  async hydrate() {
    const [token, userRaw] = await Promise.all([
      storage.getItem(TOKEN_KEY),
      storage.getItem(USER_KEY),
    ]);
    if (token && userRaw) {
      setAuthToken(token);
      set({ token, user: JSON.parse(userRaw), status: "authenticated" });
    } else {
      set({ status: "unauthenticated" });
    }
  },

  async login(email, password) {
    set({ status: "loading", error: null });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const { token, user } = data;
      setAuthToken(token);
      await Promise.all([
        storage.setItem(TOKEN_KEY, token),
        storage.setItem(USER_KEY, JSON.stringify(user)),
      ]);
      set({ token, user, status: "authenticated", error: null });
    } catch (err) {
      set({ status: "unauthenticated", error: err.message });
      throw err;
    }
  },

  async logout() {
    setAuthToken(null);
    await Promise.all([storage.removeItem(TOKEN_KEY), storage.removeItem(USER_KEY)]);
    set({ token: null, user: null, status: "unauthenticated", error: null });
  },
}));

registerUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});
