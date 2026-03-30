import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth.api";
import { clearAuthState, getStoredToken, getStoredUser, saveAuthState } from "../utils/storage";
import { AuthContext } from "./auth-context";

const resolveAuthErrorMessage = (error, fallbackMessage) => {
  if (!error.response) {
    return "Cannot reach the server. Please start the backend API and try again.";
  }

  return (
    error.response?.data?.issues?.[0]?.message ||
    error.response?.data?.message ||
    fallbackMessage
  );
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const logout = useCallback(() => {
    clearAuthState();
    setToken(null);
    setUser(null);
    setAuthError("");
  }, []);

  const applyAuthPayload = useCallback((payload) => {
    saveAuthState({ token: payload.token, user: payload.user });
    setToken(payload.token);
    setUser(payload.user);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const savedToken = getStoredToken();

    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      setUser(response.user);
      saveAuthState({ token: savedToken, user: response.user });
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshCurrentUser();
  }, [refreshCurrentUser]);

  useEffect(() => {
    const unauthorizedListener = () => {
      logout();
    };

    globalThis.addEventListener("buildmyteam:unauthorized", unauthorizedListener);

    return () => {
      globalThis.removeEventListener("buildmyteam:unauthorized", unauthorizedListener);
    };
  }, [logout]);

  const login = useCallback(async (payload) => {
    setAuthError("");

    try {
      const response = await authApi.login(payload);
      applyAuthPayload(response);
      return response;
    } catch (error) {
      const message = resolveAuthErrorMessage(error, "Login failed. Please try again.");
      setAuthError(message);
      throw error;
    }
  }, [applyAuthPayload]);

  const signup = useCallback(async (payload) => {
    setAuthError("");

    try {
      const response = await authApi.signup(payload);
      applyAuthPayload(response);
      return response;
    } catch (error) {
      const message = resolveAuthErrorMessage(error, "Registration failed. Please try again.");
      setAuthError(message);
      throw error;
    }
  }, [applyAuthPayload]);

  const value = useMemo(() => {
    const isAuthenticated = Boolean(token && user);
    const isAdmin = user?.role === "admin";
    const isApproved = Boolean(isAdmin || user?.status === "approved");

    return {
      token,
      user,
      loading,
      authError,
      isAuthenticated,
      isAdmin,
      isApproved,
      login,
      signup,
      logout,
      refreshCurrentUser,
      setAuthError,
    };
  }, [token, user, loading, authError, login, signup, logout, refreshCurrentUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
