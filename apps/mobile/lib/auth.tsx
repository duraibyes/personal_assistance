import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, AuthUser, clearSession, getStoredUser, getToken, setSession, setUnauthorizedHandler } from './api';
import { deviceInfo, getDeviceId } from './device';

export type SavedAccount = { userId: string; name: string | null; email: string; lastUsedAt: string };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  savedAccounts: () => Promise<SavedAccount[]>;
  continueAs: (userId: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgetDevice: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [storedToken, storedUser] = await Promise.all([getToken(), getStoredUser()]);
    setToken(storedToken);
    setUser(storedUser);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const startSession = useCallback(async (data: { token: string; user: AuthUser }) => {
    await setSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
  }, []);

  // Login and signup send the device id so the server remembers this phone for "Continue as …".
  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ token: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: { email, password, ...(await deviceInfo()) },
        token: null,
      });
      await startSession(data);
    },
    [startSession]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ token: string; user: AuthUser }>('/auth/signup', {
        method: 'POST',
        body: { email, password, ...(await deviceInfo()) },
        token: null,
      });
      await startSession(data);
    },
    [startSession]
  );

  const savedAccounts = useCallback(async () => {
    try {
      return await api<SavedAccount[]>('/auth/device/accounts', {
        method: 'POST',
        body: { deviceId: await getDeviceId() },
        token: null,
      });
    } catch {
      return [];
    }
  }, []);

  const continueAs = useCallback(
    async (userId: string) => {
      const data = await api<{ token: string; user: AuthUser }>('/auth/device/continue', {
        method: 'POST',
        body: { userId, deviceId: await getDeviceId() },
        token: null,
      });
      await startSession(data);
    },
    [startSession]
  );

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword, deviceId: await getDeviceId() },
    });
  }, []);

  const forgetDevice = useCallback(async () => {
    await api('/auth/device/forget', { method: 'POST', body: { deviceId: await getDeviceId() } });
  }, []);

  /** Signing out keeps this phone remembered, so the login screen offers "Continue as …". */
  const signOut = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(
    () => ({ user, token, loading, login, signup, signOut, refresh, savedAccounts, continueAs, changePassword, forgetDevice }),
    [user, token, loading, login, signup, signOut, refresh, savedAccounts, continueAs, changePassword, forgetDevice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
