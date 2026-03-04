// BE/src/middleware/auth.js
// Que: Verifica el JWT en cada peticion protegida
// Para que: Solo usuarios autenticados acceden a rutas privadas
// Impacto: Sin esto cualquiera puede hacer reservas o ver datos

const jwt = require('jsonwebtoken');

// ── Verificar token ───────────────────────────────────────────
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ mensaje: 'Token requerido. Inicia sesión.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded tiene: { id, id_rol, iat, exp }
    req.usuario = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Sesión expirada. Inicia sesión nuevamente.' });
    }
    return res.status(401).json({ mensaje: 'Token inválido.' });
  }
};

// ── Solo admin (id_rol === 1) ─────────────────────────────────
const soloAdmin = (req, res, next) => {
  if (req.usuario.id_rol !== 1) {
    return res.status(403).json({ mensaje: 'Acceso restringido a administradores.' });
  }
  next();
};

module.exports = { verificarToken, soloAdmin };
