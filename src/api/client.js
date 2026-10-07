import axios from "axios";
import { API_URL } from "../lib/env";

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// authStore registers itself here to log out on a 401 without api/client.js
// importing the store directly (would be circular — the store imports this
// file to make requests).
let onUnauthorized = null;
export function registerUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Every response resolves to the backend's envelope as-is ({ success, data,
// meta? }) — callers destructure `data`/`meta` themselves. See
// .claude/skills/api-design/skill.md.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    const message = error.response?.data?.error?.message ?? error.message ?? "Something went wrong";
    return Promise.reject(new Error(message));
  }
);
