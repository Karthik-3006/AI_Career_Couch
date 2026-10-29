import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

const normalizeUser = (userData) => {
  if (!userData) return null;
  const copy = { ...userData };
  if (copy._id && !copy.id) copy.id = copy._id;
  if (copy.id && !copy._id) copy._id = copy.id;
  if (!Array.isArray(copy.roles) || copy.roles.length === 0) {
    copy.roles = ['student'];
  }
  return copy;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.me()
        .then((userData) => {
          setUser(normalizeUser(userData));
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const data = await authService.login({ email: cleanEmail, password });
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
    }
    
    let userData = null;
    try {
      userData = await authService.me();
    } catch (meErr) {
      if (data.user) {
        userData = data.user;
      } else {
        throw meErr;
      }
    }
    const finalUser = normalizeUser(userData);
    setUser(finalUser);
    return finalUser;
  };

  const register = async (registerData) => {
    const cleanEmail = (registerData.email || '').trim().toLowerCase();
    const payload = {
      ...registerData,
      email: cleanEmail
    };
    await authService.register(payload);
    
    // Auto-login after successful registration
    try {
      return await login(cleanEmail, registerData.password);
    } catch (loginErr) {
      console.warn('Auto-login after registration encountered an issue:', loginErr);
      return null;
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const updated = await authService.updateProfile(profileData);
    const normalized = normalizeUser(updated);
    setUser(normalized);
    return normalized;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, updateProfile, sidebarOpen, toggleSidebar }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
