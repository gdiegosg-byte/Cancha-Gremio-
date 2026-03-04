// BE/src/routes/reservas.js
// Rutas de reservas: disponibilidad, CRUD

const express = require('express');
const router = express.Router();
const { verificarToken, soloAdmin } = require('../middleware/auth');
const {
  verificarDisponibilidad,
  crearReserva,
  obtenerReservas,
  obtenerReservaPorId,
  cambiarEstadoReserva,
  obtenerCatalogo,
} = require('../controllers/reservasController');

// GET  /api/reservas/disponibilidad?fecha=YYYY-MM-DD  → horarios libres
router.get('/disponibilidad', verificarToken, verificarDisponibilidad);

// GET  /api/reservas/catalogo  → espacios, tipos evento, estados
router.get('/catalogo', verificarToken, obtenerCatalogo);

// GET  /api/reservas  → lista (admin ve todas, cliente ve las suyas)
router.get('/', verificarToken, obtenerReservas);

// GET  /api/reservas/:id  → detalle de una reserva
router.get('/:id', verificarToken, obtenerReservaPorId);

// POST /api/reservas  → crear nueva reserva
router.post('/', verificarToken, crearReserva);

// PUT  /api/reservas/:id/estado  → cambiar estado (confirmar/cancelar)
router.put('/:id/estado', verificarToken, cambiarEstadoReserva);

module.exports = router;






















