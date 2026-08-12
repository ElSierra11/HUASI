import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

// Decodifica el payload de un JWT sin verificar firma (solo para lectura local)
function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stayu_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Al cargar, intenta validar con /me. Si falla pero hay token válido, mantiene la sesión local.
  useEffect(() => {
    const token = localStorage.getItem('stayu_token');
    const savedUser = localStorage.getItem('stayu_user');

    api.get('/auth/me')
      .then(res => {
        setUser(res.data);
        localStorage.setItem('stayu_user', JSON.stringify(res.data));
      })
      .catch(() => {
        // Si /me falla, verificar si hay token válido (no expirado) en localStorage
        if (token && savedUser) {
          const decoded = decodeJwt(token);
          if (decoded && decoded.exp * 1000 > Date.now()) {
            // El token todavía es válido — mantener la sesión local
            setUser(JSON.parse(savedUser));
          } else {
            // Token expirado o inválido — cerrar sesión
            setUser(null);
            localStorage.removeItem('stayu_user');
            localStorage.removeItem('stayu_token');
          }
        } else {
          setUser(null);
          localStorage.removeItem('stayu_user');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    localStorage.setItem('stayu_user', JSON.stringify(res.data.user));
    if (res.data.token) {
      localStorage.setItem('stayu_token', res.data.token);
    }
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  };

  const verifyOtp = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    setUser(res.data.user);
    localStorage.setItem('stayu_user', JSON.stringify(res.data.user));
    if (res.data.token) {
      localStorage.setItem('stayu_token', res.data.token);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      localStorage.removeItem('stayu_user');
      localStorage.removeItem('stayu_token');
    }
  };

  const refreshUser = async () => {
    const res = await api.get('/auth/me');
    setUser(res.data);
    localStorage.setItem('stayu_user', JSON.stringify(res.data));
  };

  // Como ya no manejamos token manual, solo devolvemos si hay user autenticado
  const token = !!user;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyOtp, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
