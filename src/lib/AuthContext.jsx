import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'dgc-auth-user';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const savedUser = window.localStorage.getItem(STORAGE_KEY);

    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);

      fetch(`${API_URL}/auth/me`, {
        headers: { 'x-user-email': parsed.email },
      })
        .then((res) => res.json())
        .then((freshUser) => {
          if (freshUser?.id) {
            setUser(freshUser);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingAuth(false));
    } else {
      setIsLoadingAuth(false);
    }
  }, []);

  const login = async ({ email, password }) => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales inválidas.');
      }

      setUser(data);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      return data;
    } catch (error) {
      console.error('Error en login:', error);
      setAuthError({
        type: 'invalid_credentials',
        message: error.message || 'Usuario o contraseña incorrectos.',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setAuthError(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      authError,
      isAuthenticated: Boolean(user),
      isLoading,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      login,
      logout,
    }),
    [authError, isLoading, isLoadingAuth, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}