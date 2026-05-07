import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const ACCESS_KEY = 'aitc.access';
const REFRESH_KEY = 'aitc.refresh';

export const tokenStore = {
  getAccess() {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const access = tokenStore.getAccess();
  if (access && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let refreshPromise = null;

async function refreshAccess() {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new Error('no refresh token');
  const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
  tokenStore.set({ access: data.access, refresh: data.refresh });
  return data.access;
}

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url.endsWith('/auth/login/') &&
      !original.url.endsWith('/auth/refresh/')
    ) {
      original._retry = true;
      try {
        if (!refreshPromise) refreshPromise = refreshAccess().finally(() => { refreshPromise = null; });
        const newAccess = await refreshPromise;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshErr) {
        tokenStore.clear();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

export function extractError(err, fallback = 'Request failed.') {
  if (!err) return fallback;
  const data = err.response?.data;
  if (!data) return err.message || fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  // DRF field errors come back as {field: [msg, ...]}
  const parts = [];
  for (const [k, v] of Object.entries(data)) {
    const msg = Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : JSON.stringify(v);
    parts.push(k === 'non_field_errors' ? msg : `${k}: ${msg}`);
  }
  return parts.length ? parts.join(' • ') : fallback;
}
