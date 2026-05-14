import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'dgc-auth-user';

const DEMO_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    full_name: 'Administrador DGC',
    email: 'admin@dgc.cl',
    role: 'admin',
    allowed_projects: [],
  },
  {
    id: 2,
    username: 'supervisor',
    password: 'super123',
    full_name: 'Supervisor de Obra',
    email: 'supervisor@dgc.cl',
    role: 'supervisor',
    allowed_projects: [],
  },
  {
    id: 3,
    username: 'visita',
    password: 'visita123',
    full_name: 'Usuario Visita',
    email: 'visita@dgc.cl',
    role: 'viewer',
    allowed_projects: [],
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const savedUser = window.localStorage.getItem(STORAGE_KEY);

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setIsLoadingAuth(false);
  }, []);

  const login = async ({ username, password }) => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const normalizedUsername = username.trim().toLowerCase();
      const foundUser = DEMO_USERS.find(
        (demoUser) =>
          demoUser.username === normalizedUsername &&
          demoUser.password === password
      );

      if (!foundUser) {
        throw new Error('Credenciales invalidas');
      }

      const { password: _password, ...authenticatedUser } = foundUser;
      setUser(authenticatedUser);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));

      return authenticatedUser;
    } catch (error) {
      console.error('Error en login:', error);
      setAuthError({
        type: 'invalid_credentials',
        message: 'Usuario o contrasena incorrectos.',
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
