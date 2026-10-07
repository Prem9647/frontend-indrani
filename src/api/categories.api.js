import { api } from "./client";

export const categoriesApi = {
  list: (activeOnly) => api.get("/categories", { params: activeOnly ? { activeOnly: true } : undefined }),
  create: (payload) => api.post("/categories", payload),
  update: (id, payload) => api.patch(`/categories/${id}`, payload),
  remove: (id) => api.delete(`/categories/${id}`),
};
