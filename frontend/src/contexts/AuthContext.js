import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import { clearDeveloperUnlocked } from '../utils/developerAccess';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, token } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);

    return user;
  };

  const logout = () => {
    api.post('/developer/lock').catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearDeveloperUnlocked();
    setUser(null);
  };

  const updateUser = (nextUser) => {
    if (!nextUser) {
      return;
    }
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    isAdmin: user?.role === 'ADMIN',
    isEducator: user?.role === 'EDUCATOR',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
