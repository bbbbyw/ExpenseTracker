"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authLogin, authLogout, authMe, authRegister } from "@/lib/api";
import { getTokens, setTokens, type AuthTokens } from "@/lib/authTokens";

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
};

type AuthState = {
  isReady: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokensState] = useState<AuthTokens | null>(null);

  const refreshMe = useCallback(async () => {
    const t = getTokens();
    setTokensState(t);
    if (!t?.accessToken) {
      setUser(null);
      return;
    }
    try {
      const me = await authMe();
      setUser(me);
    } catch {
      setUser(null);
      setTokensState(null);
      setTokens(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshMe();
      setIsReady(true);
    })();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const t = await authLogin({ email, password });
    setTokens(t);
    setTokensState(t);
    await refreshMe();
  }, [refreshMe]);

  const register = useCallback(
    async (payload: { email: string; password: string; firstName: string; lastName: string }) => {
      await authRegister(payload);
      // Immediately log in after registration for a smooth UX
      await login(payload.email, payload.password);
    },
    [login]
  );

  const logout = useCallback(() => {
    const current = getTokens();
    if (current?.refreshToken) {
      void authLogout(current.refreshToken);
    }
    setTokens(null);
    setTokensState(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ isReady, user, tokens, login, register, logout, refreshMe }),
    [isReady, user, tokens, login, register, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}

