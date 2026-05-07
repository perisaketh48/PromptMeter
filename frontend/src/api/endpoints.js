import { api } from './client.js';

export const auth = {
  register: (payload) => api.post('/auth/register/', payload),
  login: (payload) => api.post('/auth/login/', payload),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  updateMe: (payload) => api.patch('/auth/me/', payload),
  profile: () => api.get('/auth/profile/'),
  updateProfile: (payload) => api.patch('/auth/profile/', payload),
  changePassword: (payload) => api.post('/auth/change-password/', payload),
};

export const catalog = {
  providers: (params) => api.get('/catalog/providers/', { params }),
  models: (params) => api.get('/catalog/models/', { params }),
  capabilities: () => api.get('/catalog/models/capabilities/'),
  createProvider: (payload) => api.post('/catalog/providers/', payload),
  updateProvider: (slug, payload) => api.patch(`/catalog/providers/${slug}/`, payload),
  deleteProvider: (slug) => api.delete(`/catalog/providers/${slug}/`),
  createModel: (payload) => api.post('/catalog/models/', payload),
  updateModel: (id, payload) => api.patch(`/catalog/models/${id}/`, payload),
  deleteModel: (id) => api.delete(`/catalog/models/${id}/`),
};

export const tokenizer = {
  estimate: (payload) => api.post('/tokenizer/estimate/', payload),
  history: (params) => api.get('/tokenizer/history/', { params }),
  deleteHistory: (id) => api.delete(`/tokenizer/history/${id}/`),
};

export const billing = {
  plans: () => api.get('/billing/plans/'),
  subscription: () => api.get('/billing/subscription/'),
  changePlan: (plan_code) => api.post('/billing/subscription/change/', { plan_code }),
  cancel: () => api.post('/billing/subscription/cancel/'),
  invoices: () => api.get('/billing/invoices/'),
  quota: () => api.get('/billing/quota/'),
};

export const usage = {
  records: (params) => api.get('/usage/records/', { params }),
  summary: (params) => api.get('/usage/summary/', { params }),
  byDay: (params) => api.get('/usage/by-day/', { params }),
  byModel: (params) => api.get('/usage/by-model/', { params }),
  exportUrl: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
    return `${base}/usage/export/${qs ? `?${qs}` : ''}`;
  },
};

export const budgets = {
  list: () => api.get('/budgets/budgets/'),
  create: (payload) => api.post('/budgets/budgets/', payload),
  update: (id, payload) => api.patch(`/budgets/budgets/${id}/`, payload),
  remove: (id) => api.delete(`/budgets/budgets/${id}/`),
  alerts: (id) => api.get(`/budgets/budgets/${id}/alerts/`),
  notifications: (params) => api.get('/budgets/notifications/', { params }),
  markRead: (id) => api.post(`/budgets/notifications/${id}/read/`),
  markAllRead: () => api.post('/budgets/notifications/read-all/'),
};

export const proxy = {
  credentials: () => api.get('/proxy/credentials/'),
  createCredential: (payload) => api.post('/proxy/credentials/', payload),
  deleteCredential: (id) => api.delete(`/proxy/credentials/${id}/`),
  chat: (payload) => api.post('/proxy/chat/', payload),
};

export const adminApi = {
  users: (params) => api.get('/admin-panel/users/', { params }),
  updateUser: (id, payload) => api.patch(`/admin-panel/users/${id}/`, payload),
  assignPlan: (id, plan_code) => api.post(`/admin-panel/users/${id}/assign-plan/`, { plan_code }),
  stats: () => api.get('/admin-panel/stats/'),
  feedback: (params) => api.get('/admin-panel/feedback/', { params }),
  updateFeedback: (id, payload) => api.patch(`/admin-panel/feedback/${id}/`, payload),
};

export const feedback = {
  submit: (payload) => api.post('/feedback/submit/', payload),
};
