import { api } from "./client";

export const settingsApi = {
  get: () => api.get("/settings"),
};
