const { pool } = require('../config/database');

// ── POST /api/pagos ──────────────────────────────────
const registrarPago = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id_reserva, id_metodo_pago, abono } = req.body;
    const id_usuario = req.usuario.id;

    // Verificar que la reserva existe y pertenece al usuario
    const [reservas] = await connection.query(
      'SELECT * FROM Reservas WHERE id_reserva = ? AND id_usuario = ?',
      [id_reserva, id_usuario]
    );
    if (reservas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Reserva no encontrada.' });
    }
    const reserva = reservas[0];

    // Verificar que no tenga ya un pago completado
    const [pagoExistente] = await connection.query(
      "SELECT id_pago FROM Pagos WHERE id_reserva = ? AND estado = 'completado'",
      [id_reserva]
    );
    if (pagoExistente.length > 0) {
      await connection.rollback();
      return res.status(400).json({ mensaje: 'Esta reserva ya tiene un pago registrado.' });
    }

    const abonoReal = abono || reserva.valor_reserva;
    const saldo_restante = reserva.valor_reserva - abonoReal;
    const estadoPago = saldo_restante <= 0 ? 'completado' : 'pendiente';

    const [result] = await connection.query(
      `INSERT INTO Pagos (valor_total, abono, saldo_restante, estado, id_reserva, id_metodo_pago)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [reserva.valor_reserva, abonoReal, saldo_restante < 0 ? 0 : saldo_restante, estadoPago, id_reserva, id_metodo_pago]
    );

    // Si el pago es completo, confirmar la reserva (estado 2)
    if (estadoPago === 'completado') {
      await connection.query(
        'UPDATE Reservas SET id_estado_reserva = 2 WHERE id_reserva = ?',
        [id_reserva]
      );
    }

    await connection.commit();
    res.status(201).json({
      mensaje: estadoPago === 'completado' ? 'Pago completado y reserva confirmada.' : 'Abono registrado.',
      pago: { id_pago: result.insertId, valor_total: reserva.valor_reserva, abono: abonoReal, saldo_restante, estado: estadoPago },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error registrando pago:', error);
    res.status(500).json({ mensaje: 'Error al registrar el pago.' });
  } finally {
    connection.release();
  }
};

// ── GET /api/pagos ───────────────────────────────────
const obtenerPagos = async (req, res) => {
  try {
    const esAdmin = req.usuario.id_rol === 1;
    let query = `
      SELECT p.*, mp.nombre_metodo, mp.icono,
             r.fecha_reserva, r.valor_reserva,
             u.nombre AS nombre_usuario, u.correo
      FROM Pagos p
      JOIN Reservas r ON p.id_reserva = r.id_reserva
      JOIN Metodos_Pago mp ON p.id_metodo_pago = mp.id_metodo_pago
      JOIN Usuarios u ON r.id_usuario = u.id_usuario
    `;
    const params = [];
    if (!esAdmin) {
      query += ' WHERE r.id_usuario = ?';
      params.push(req.usuario.id);
    }
    query += ' ORDER BY p.fecha_pago DESC';

    const [pagos] = await pool.query(query, params);
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener pagos.' });
  }
};

// ── GET /api/pagos/comprobante/:id ────────────────────
const obtenerComprobante = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, mp.nombre_metodo,
              r.fecha_reserva, r.valor_reserva,
              u.nombre, u.correo, u.telefono,
              e.fecha, e.hora_inicio, e.hora_fin,
              esp.nombre AS espacio
       FROM Pagos p
       JOIN Reservas r     ON p.id_reserva = r.id_reserva
       JOIN Metodos_Pago mp ON p.id_metodo_pago = mp.id_metodo_pago
       JOIN Usuarios u     ON r.id_usuario = u.id_usuario
       LEFT JOIN Eventos e ON r.id_evento = e.id_evento
       LEFT JOIN Espacios esp ON e.id_espacio = esp.id_espacio
       WHERE p.id_pago = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Comprobante no encontrado.' });

    const p = rows[0];
    res.json({
      comprobante: {
        numero: `CG-${String(p.id_pago).padStart(6, '0')}`,
        fecha_pago: p.fecha_pago,
        cliente: p.nombre,
        correo: p.correo,
        telefono: p.telefono,
        espacio: p.espacio,
        fecha_reserva: p.fecha,
        hora: `${p.hora_inicio} - ${p.hora_fin}`,
        valor_total: p.valor_total,
        abono: p.abono,
        saldo_restante: p.saldo_restante,
        metodo_pago: p.nombre_metodo,
        estado: p.estado,
      },
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener comprobante.' });
  }
};

// ── GET /api/pagos/metodos ───────────────────────────
const obtenerMetodosPago = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id_metodo_pago, nombre_metodo, icono FROM Metodos_Pago');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener métodos de pago.' });
  }
};

module.exports = { registrarPago, obtenerPagos, obtenerComprobante, obtenerMetodosPago };