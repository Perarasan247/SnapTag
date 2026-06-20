import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSession, logout as authLogout } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then((s) => { setSession(s); setLoading(false); });
  }, []);

  const login = (sessionData) => setSession(sessionData);

  const logout = async () => {
    await authLogout();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
