import { api } from "./client";

export const AuthAPI = {
  login: (payload) => api.post("/auth/login", payload).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
};

export const UsersAPI = {
  listSales: () => api.get("/users").then((r) => r.data),
  listManagers: () => api.get("/users/managers").then((r) => r.data),
  updateManager: (id, data) =>
  api.patch(`/users/managers/${id}`, data).then(r => r.data),
  myTeam: () => api.get("/users/my-team").then((r) => r.data),
  me: () => api.get("/users/me").then((r) => r.data),
  updateMe: (payload) => api.patch("/users/me", payload).then((r) => r.data),
  updateMyTeam: (id, data) =>
  api.patch(`/users/my-team/${id}`, data).then(r => r.data),
  lookup: (ids) =>
    api
      .get("/users/lookup", { params: { ids: ids.join(",") } })
      .then((r) => r.data),
};



export const projectsAPI = {
  list: () => api.get("/products").then((r) => r.data),
  get: (id) => api.get(`/products/${id}`).then(r => r.data),
  create: (payload) => api.post("/products", payload).then((r) => r.data),
  update: (id, payload) =>
  api.patch(`/products/${id}`, payload).then((r) => r.data),
  delete: (id) =>
  api.post(`/products/${id}/delete`).then((r) => r.data),
}

export const analyticsManager = async ({ days = 30 }) => {
  const res = await api.get(`/analytics/manager?days=${days}`);
  return res.data;
};

// ✅ Sales analytics (me)
export const analyticsSalesMe = async ({ days = 30 }) => {
  const res = await api.get(`/analytics/sales/me?days=${days}`);
  return res.data;
};

export const LeadsAPI = {
  list: (params) => api.get("/leads", { params }).then((r) => r.data),
  get: (id) => api.get(`/leads/${id}`).then((r) => r.data),
  create: (payload) => api.post("/leads", payload).then((r) => r.data),
  patch: (id, payload) =>
    api.patch(`/leads/${id}`, payload).then((r) => r.data),
  assign: (id, payload) =>
    api.post(`/leads/${id}/assign`, payload).then((r) => r.data),
  addNote: (id, payload) =>
    api.post(`/leads/${id}/notes`, payload).then((r) => r.data),
  bulkAssign: (payload) =>
    api.post(`/leads/bulk/assign`, payload).then((r) => r.data),
  bulkStatus: (payload) =>  
    api.patch(`/leads/bulk/status`, payload).then((r) => r.data),
  bulkTemperature: (payload) =>
    api.patch(`/leads/bulk/temperature`, payload).then((r) => r.data),
  bulkStage: (payload) =>
    api.patch(`/leads/bulk/stage`, payload).then((r) => r.data),
  bulkCsvUpload: (formData) =>
    api.post(`/leads/bulk/csv`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }).then((r) => r.data),
  followups: (id, productId) => api.get(`/leads/${id}/followups`, { params: productId ? { product_id: productId } : {} }).then((r) => r.data),
  addFollowup: (id, payload) =>
    api.post(`/leads/${id}/followups`, payload).then((r) => r.data),
  audit: (id) => api.get(`/leads/${id}/audit`).then((r) => r.data),
  exportCsvUrl: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return api.defaults.baseURL + `/leads/export.csv${qs ? "?" + qs : ""}`;
  },
   exportCsv: (params) =>
    api.get("/leads/export.csv", {
      params,
      responseType: "blob",
    }),
};

export const NotificationsAPI = {
  list: (params) => api.get("/notifications", { params }).then((r) => r.data),
  read: (id) =>
    api.patch(`/notifications/${id}/read`, { read: true }).then((r) => r.data),
  readAll: () => api.patch(`/notifications/read-all`).then((r) => r.data),
};

export const AnalyticsAPI = {
  manager: (params) =>
    api.get("/analytics/manager", { params }).then((r) => r.data),
  salesMe: (params) =>
    api.get("/analytics/sales/me", { params }).then((r) => r.data),
  revenueManager: (params) =>
    api.get("/analytics/revenue/manager", { params }).then((r) => r.data),
  team: (params) => api.get("/analytics/team", { params }).then((r) => r.data),
};

export const ViewsAPI = {
  list: () => api.get("/views").then((r) => r.data),
  create: (payload) => api.post("/views", payload).then((r) => r.data),
  delete: (id) => api.delete(`/views/${id}`).then((r) => r.data),
};

export const AchievementsAPI = {
  me: () => api.get("/achievements/me").then((r) => r.data),
  award: (payload) => api.post("/achievements", payload).then((r) => r.data),
};

export const InvoicesAPI = {
  create: (payload) => api.post("/invoices", payload).then((r) => r.data),
  list: (params) => api.get("/invoices", { params }).then((r) => r.data),
  get: (id) => api.get(`/invoices/${id}`).then((r) => r.data),
  patch: (id, payload) =>
    api.patch(`/invoices/${id}`, payload).then((r) => r.data),
};

export const AdminAPI = {
  seed: () => api.post("/admin/seed").then((r) => r.data),
};