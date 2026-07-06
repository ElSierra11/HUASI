import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stayu_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Al cargar, siempre intenta validar si hay sesión activa consultando /me
  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        setUser(res.data);
        localStorage.setItem('stayu_user', JSON.stringify(res.data));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('stayu_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    localStorage.setItem('stayu_user', JSON.stringify(res.data.user));
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    // Ya no hacemos setUser aquí porque devuelve un mensaje y un email para el paso de OTP
    return res.data;
  };

  const verifyOtp = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    setUser(res.data.user);
    localStorage.setItem('stayu_user', JSON.stringify(res.data.user));
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
