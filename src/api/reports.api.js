import { api } from "./client";

export const reportsApi = {
  dailySales: (date) => api.get("/reports/sales/daily", { params: date ? { date } : undefined }),
  weeklySales: () => api.get("/reports/sales/weekly"),
  monthlySales: () => api.get("/reports/sales/monthly"),
  popularItems: (limit) => api.get("/reports/popular-items", { params: limit ? { limit } : undefined }),
  leastOrderedItems: (limit) => api.get("/reports/least-ordered-items", { params: limit ? { limit } : undefined }),
  tableUsage: () => api.get("/reports/table-usage"),
  overview: () => api.get("/reports/overview"),
  customerOrderHistory: (customerId, page, limit) =>
    api.get(`/reports/customers/${customerId}/orders`, { params: { page, limit } }),
  itemSales: (menuItemId, period = "daily") => api.get(`/reports/item-sales/${menuItemId}`, { params: { period } }),
};
