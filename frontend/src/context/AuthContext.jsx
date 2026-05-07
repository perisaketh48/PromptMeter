import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStore } from '../api/client.js';
import { auth as authApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { data } = await authApi.me();
      setUser(data);
      return data;
    } catch {
      tokenStore.clear();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await authApi.login({ email, password });
    tokenStore.set({ access: data.access, refresh: data.refresh });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    tokenStore.set({ access: data.access, refresh: data.refresh });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      // ignore — we always clear locally
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser, setUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
