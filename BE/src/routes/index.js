// BE/src/routes/index.js
// Rutas de pagos y administracion

const express = require('express');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const {
  registrarPago,
  obtenerPagos,
  obtenerComprobante,
  obtenerMetodosPago,
} = require('../controllers/pagosController');
const { pool } = require('../config/database');

// ── PAGOS ─────────────────────────────────────────────────────
const pagosRouter = express.Router();

// GET  /api/pagos/metodos  → lista de métodos de pago disponibles
pagosRouter.get('/metodos', verificarToken, obtenerMetodosPago);

// GET  /api/pagos/comprobante/:id  → comprobante de un pago
pagosRouter.get('/comprobante/:id', verificarToken, obtenerComprobante);

// GET  /api/pagos  → historial (admin ve todos, cliente los suyos)
pagosRouter.get('/', verificarToken, obtenerPagos);

// POST /api/pagos  → registrar pago de una reserva
pagosRouter.post('/', verificarToken, registrarPago);

// ── ADMIN ─────────────────────────────────────────────────────
const adminRouter = express.Router();

// GET /api/admin/reporte  → estadísticas generales del negocio
adminRouter.get('/reporte', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [totalReservas]   = await pool.query('SELECT COUNT(*) AS total FROM Reservas');
    const [totalUsuarios]   = await pool.query("SELECT COUNT(*) AS total FROM Usuarios WHERE id_rol = 2");
    const [totalIngresos]   = await pool.query("SELECT COALESCE(SUM(abono), 0) AS total FROM Pagos WHERE estado = 'completado'");
    const [reservasPendientes] = await pool.query(
      "SELECT COUNT(*) AS total FROM Reservas r JOIN Estado_reserva e ON r.id_estado_reserva = e.id_estado_reserva WHERE e.nombre_estado = 'pendiente'"
    );
    const [ultimasReservas] = await pool.query(`
      SELECT r.id_reserva, u.nombre, u.correo, r.valor_reserva,
             er.nombre_estado, e.fecha, e.hora_inicio, e.hora_fin
      FROM Reservas r
      JOIN Usuarios u ON r.id_usuario = u.id_usuario
      JOIN Estado_reserva er ON r.id_estado_reserva = er.id_estado_reserva
      LEFT JOIN Eventos e ON r.id_evento = e.id_evento
      ORDER BY r.fecha_reserva DESC
      LIMIT 10
    `);

    res.json({
      totalReservas:      totalReservas[0]?.total || 0,
      totalUsuarios:      totalUsuarios[0]?.total || 0,
      totalIngresos:      totalIngresos[0]?.total || 0,
      reservasPendientes: reservasPendientes[0]?.total || 0,
      ultimasReservas,
    });
  } catch (error) {
    console.error('Error reporte:', error);
    res.status(500).json({ mensaje: 'Error al generar reporte.' });
  }
});

// GET /api/admin/clientes  → lista de todos los clientes
adminRouter.get('/clientes', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [clientes] = await pool.query(`
      SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.estado,
             u.fecha_registro,
             COUNT(r.id_reserva) AS total_reservas
      FROM Usuarios u
      LEFT JOIN Reservas r ON u.id_usuario = r.id_usuario
      WHERE u.id_rol = 2
      GROUP BY u.id_usuario
      ORDER BY u.fecha_registro DESC
    `);
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener clientes.' });
  }
});

// PUT /api/admin/clientes/:id/estado  → activar/desactivar cliente
adminRouter.put('/clientes/:id/estado', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { estado } = req.body; // 'activo' | 'inactivo'
    await pool.query('UPDATE Usuarios SET estado = $1 WHERE id_usuario = $2', [estado, req.params.id]);
    res.json({ mensaje: `Cliente ${estado === 'activo' ? 'activado' : 'desactivado'} correctamente.` });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar estado del cliente.' });
  }
});

module.exports = { pagosRouter, adminRouter };