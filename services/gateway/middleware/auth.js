const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'stayu_secret_key';

/**
 * Middleware que extrae el usuario del JWT y lo adjunta al header
 * para que los microservicios downstream lo reciban.
 * No bloquea si no hay token — las rutas individuales deciden.
 */
function authMiddleware(req, res, next) {
  const origin = req.headers.origin || req.headers.referer || '';
  const isAdminPanel = origin.includes('huasi-mdp5') || origin.includes('admin') || origin.includes(':5176') || origin.includes(':5175') || origin.includes(':5174');
  
  let token;
  if (isAdminPanel) {
    token = req.cookies?.stayu_admin_token || req.cookies?.stayu_token;
  } else {
    token = req.cookies?.stayu_token || req.cookies?.stayu_admin_token;
  }
  
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      // Pasar info del usuario a los microservicios via headers
      req.headers['authorization'] = `Bearer ${token}`; // Forward the token downstream
      req.headers['x-user-id'] = decoded.id.toString();
      req.headers['x-user-email'] = decoded.email;
      req.headers['x-user-role'] = decoded.role;
      req.headers['x-user-verificado'] = decoded.verificado.toString();
    } catch (err) {
      // Token inválido — no bloquear, dejar que el servicio decida
    }
  }

  next();
}

/**
 * Middleware que REQUIERE autenticación — retorna 401 si no hay token válido.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }
  next();
}

module.exports = { authMiddleware, requireAuth };
