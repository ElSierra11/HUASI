import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true // Permite enviar cookies HttpOnly
});

// Interceptor para adjuntar token Authorization Bearer si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stayu_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequestUrl = error.config?.url;
    // Si da 401 pero era solo revisando la sesión (/auth/me), no redirigimos forzosamente
    if (error.response?.status === 401 && originalRequestUrl !== '/auth/me') {
      const publicPaths = ['/login', '/register', '/registro', '/terminos', '/privacidad', '/quienes-somos', '/'];
      const isPublic = publicPaths.includes(window.location.pathname) || window.location.pathname.startsWith('/propiedad/');
      if (!isPublic) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
