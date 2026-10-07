import { api } from "./client";

export const ordersApi = {
  create: (payload) => api.post("/orders", payload),
  get: (id) => api.get(`/orders/${id}`),
  list: (params) => api.get("/orders", { params }),
  addItems: (id, items) => api.post(`/orders/${id}/items`, { items }),
  updateItemQuantity: (id, orderItemId, quantity) => api.patch(`/orders/${id}/items/${orderItemId}`, { quantity }),
  removeItem: (id, orderItemId, cancelQuantity) => 
    api.delete(`/orders/${id}/items/${orderItemId}`, { params: cancelQuantity ? { cancelQuantity } : undefined }),
  deliverItem: (id, orderItemId) => api.post(`/orders/${id}/items/${orderItemId}/deliver`),
  generateBill: (id, discount) => api.post(`/orders/${id}/bill`, { discount }),
  requestBill: (id) => api.post(`/orders/${id}/request-bill`),
};
