import { api } from "./client";

export const usersApi = {
  list: (role) => api.get("/users", { params: role ? { role } : undefined }),
  get: (id) => api.get(`/users/${id}`),
  create: (payload) => api.post("/users", payload),
  update: (id, payload) => api.patch(`/users/${id}`, payload),
  resetPassword: (id, password) => api.patch(`/users/${id}/reset-password`, { password }),
};
