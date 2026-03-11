const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { registro, login, perfil, actualizarPerfil, forgotPassword, resetPassword } = require('../controllers/authController');

router.post('/registro', registro);
router.post('/login', login);
router.get('/perfil', verificarToken, perfil);
router.put('/perfil', verificarToken, actualizarPerfil);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;