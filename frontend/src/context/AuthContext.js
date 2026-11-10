import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserFromToken } from '../services/auth.js'; // decode JWT payload
import { useNavigate } from 'react-router-dom';

// Create Auth Context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to clear all session data
  const clearSession = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  // Logout – clear session and redirect to login page
  const logout = () => {
    clearSession();
    navigate('/login');
  };

  // On mount, decode token (if present) and set auto‑logout timer
  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) {
      const decoded = getUserFromToken(); // returns payload or null
      if (decoded) {
        setUser(decoded);
        // Schedule auto‑logout when token expires
        const expiresIn = decoded.exp * 1000 - Date.now();
        if (expiresIn > 0) {
          const timeoutId = setTimeout(() => {
            clearSession();
            navigate('/login');
          }, expiresIn);
          return () => clearTimeout(timeoutId);
        }
      } else {
        clearSession();
      }
    }
    setLoading(false);
  }, [clearSession, navigate]);

  // Login – store tokens, decode payload, and navigate to home/dashboard
  const login = ({ access_token, refresh_token }) => {
    if (access_token) localStorage.setItem('access_token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    const decoded = getUserFromToken();
    setUser(decoded);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
