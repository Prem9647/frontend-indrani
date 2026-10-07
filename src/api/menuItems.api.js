import { api } from "./client";

export const menuItemsApi = {
  list: (filters = {}) => api.get("/menu-items", { params: filters }),
  create: (payload) => api.post("/menu-items", payload),
  update: (id, payload) => api.patch(`/menu-items/${id}`, payload),
  remove: (id) => api.delete(`/menu-items/${id}`),
};
