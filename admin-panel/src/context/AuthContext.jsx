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
    const saved = localStorage.getItem('stayu_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('stayu_admin_token');
    const savedUser = localStorage.getItem('stayu_admin_user');

    api.get('/auth/me')
      .then(res => {
        if (res.data.role !== 'admin') {
          throw new Error('No es admin');
        }
        setUser(res.data);
        localStorage.setItem('stayu_admin_user', JSON.stringify(res.data));
      })
      .catch(() => {
        // Si /me falla, verificar si hay token válido (no expirado) en localStorage
        if (token && savedUser) {
          const decoded = decodeJwt(token);
          if (decoded && decoded.exp * 1000 > Date.now() && decoded.role === 'admin') {
            // El token todavía es válido — mantener la sesión local
            setUser(JSON.parse(savedUser));
          } else {
            setUser(null);
            localStorage.removeItem('stayu_admin_user');
            localStorage.removeItem('stayu_admin_token');
          }
        } else {
          setUser(null);
          localStorage.removeItem('stayu_admin_user');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.user.role !== 'admin') {
      throw new Error('No tienes permisos de administrador');
    }
    setUser(res.data.user);
    localStorage.setItem('stayu_admin_user', JSON.stringify(res.data.user));
    if (res.data.token) {
      localStorage.setItem('stayu_admin_token', res.data.token);
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
      localStorage.removeItem('stayu_admin_user');
      localStorage.removeItem('stayu_admin_token');
    }
  };

  const token = !!user;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
