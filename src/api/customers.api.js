import { api } from "./client";

export const customersApi = {
  list: () => api.get("/customers"),
  search: (q) => api.get("/customers/search", { params: { q } }),
  get: (id) => api.get(`/customers/${id}`),
  create: (payload) => api.post("/customers", payload),
  update: (id, payload) => api.patch(`/customers/${id}`, payload),
};
