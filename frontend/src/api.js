import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true // Permite enviar cookies HttpOnly
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
