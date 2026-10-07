import { api } from "./client";

export const tablesApi = {
  list: () => api.get("/tables"),
  create: (payload) => api.post("/tables", payload),
  update: (id, payload) => api.patch(`/tables/${id}`, payload),
  remove: (id) => api.delete(`/tables/${id}`),
};
