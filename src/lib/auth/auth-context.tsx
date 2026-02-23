"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, setAuthToken, clearAuthToken } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { User } from "@/lib/api/types";

type AuthState = {
  user: User | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  setAuth: (user: User, token: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_USER_KEY = "tracex_user";

function setStoredUser(user: User | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
  });
  const authMeInFlightRef = useRef(false);

  const setAuth = useCallback((user: User, token: string) => {
    setAuthToken(token);
    setStoredUser(user);
    setState({ user, isLoading: false });
  }, []);

  const updateUser = useCallback((user: User) => {
    setStoredUser(user);
    setState((s) => ({ ...s, user }));
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setStoredUser(null);
    setState({ user: null, isLoading: false });
    router.push("/signin");
  }, [router]);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("tracex_token")
        : null;
    if (!token) {
      setStoredUser(null);
      const id = setTimeout(
        () => setState((s) => ({ ...s, isLoading: false })),
        0
      );
      return () => clearTimeout(id);
    }
    if (authMeInFlightRef.current) return;
    authMeInFlightRef.current = true;
    let cancelled = false;
    api
      .get<{ user: User }>(endpoints.auth.me)
      .then((res) => {
        if (cancelled) return;
        const user = res?.user ?? null;
        setStoredUser(user);
        setState({ user, isLoading: false });
      })
      .catch(() => {
        if (cancelled) return;
        clearAuthToken();
        setStoredUser(null);
        setState({ user: null, isLoading: false });
      })
      .finally(() => {
        authMeInFlightRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextValue = {
    ...state,
    setAuth,
    updateUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
