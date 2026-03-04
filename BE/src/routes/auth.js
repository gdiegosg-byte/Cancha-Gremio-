// BE/src/routes/auth.js
// Rutas de autenticacion: registro, login, perfil

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { registro, login, perfil, actualizarPerfil } = require('../controllers/authController');

// POST /api/auth/registro  → crear cuenta
router.post('/registro', registro);

// POST /api/auth/login  → iniciar sesion, devuelve JWT
router.post('/login', login);

// GET /api/auth/perfil  → datos del usuario logueado
router.get('/perfil', verificarToken, perfil);

// PUT /api/auth/perfil  → actualizar datos personales
router.put('/perfil', verificarToken, actualizarPerfil);

module.exports = router;






















