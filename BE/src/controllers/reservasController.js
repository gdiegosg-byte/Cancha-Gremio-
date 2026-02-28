const { pool } = require('../config/database');

// ── GET /api/reservas/disponibilidad?fecha=YYYY-MM-DD ─
const verificarDisponibilidad = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ mensaje: 'La fecha es requerida.' });

    const todasLasHoras = [
      '08:00','09:00','10:00','11:00','12:00',
      '13:00','14:00','15:00','16:00','17:00',
      '18:00','19:00','20:00','21:00',
    ];

    // Obtener eventos reservados ese día
    const [ocupados] = await pool.query(
      `SELECT e.hora_inicio, e.hora_fin
       FROM Reservas r
       JOIN Eventos e ON r.id_evento = e.id_evento
       JOIN Estado_reserva er ON r.id_estado_reserva = er.id_estado_reserva
       WHERE e.fecha = ? AND er.nombre_estado IN ('pendiente','confirmada')`,
      [fecha]
    );

    const horasOcupadas = new Set();
    ocupados.forEach(({ hora_inicio, hora_fin }) => {
      const inicio = parseInt(hora_inicio.split(':')[0]);
      const fin    = parseInt(hora_fin.split(':')[0]);
      for (let h = inicio; h < fin; h++) {
        horasOcupadas.add(`${String(h).padStart(2,'0')}:00`);
      }
    });

    const horario = todasLasHoras.map((hora) => ({
      hora,
      disponible: !horasOcupadas.has(hora),
    }));

    res.json({ fecha, horario });
  } catch (error) {
    console.error('Error disponibilidad:', error);
    res.status(500).json({ mensaje: 'Error al verificar disponibilidad.' });
  }
};

// ── POST /api/reservas ───────────────────────────────
const crearReserva = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { fecha, hora_inicio, hora_fin, id_espacio = 1, id_tipo_evento = 1, id_organizador } = req.body;
    const id_usuario = req.usuario.id;

    // Verificar choque de horarios en el mismo espacio
    const [choque] = await connection.query(
      `SELECT e.id_evento FROM Eventos e
       JOIN Reservas r ON r.id_evento = e.id_evento
       JOIN Estado_reserva er ON r.id_estado_reserva = er.id_estado_reserva
       WHERE e.fecha = ? AND e.id_espacio = ?
       AND er.nombre_estado IN ('pendiente','confirmada')
       AND NOT (e.hora_fin <= ? OR e.hora_inicio >= ?)`,
      [fecha, id_espacio, hora_inicio, hora_fin]
    );

    if (choque.length > 0) {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'Ya existe una reserva en ese horario y espacio.' });
    }

    // Calcular valor (precio base por hora)
    const horas = (new Date(`1970-01-01T${hora_fin}`) - new Date(`1970-01-01T${hora_inicio}`)) / 3600000;
    const valor_reserva = horas * 80000; // precio base $80.000/hora

    // Crear el evento
    const [eventoResult] = await connection.query(
      `INSERT INTO Eventos (fecha, hora_inicio, hora_fin, id_espacio, id_tipo_evento, id_usuario, id_organizador)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fecha, hora_inicio, hora_fin, id_espacio, id_tipo_evento, id_usuario, id_organizador || null]
    );

    // Crear la reserva
    const [reservaResult] = await connection.query(
      `INSERT INTO Reservas (valor_reserva, fecha_reserva, id_evento, id_usuario, id_estado_reserva)
       VALUES (?, ?, ?, ?, 1)`,
      [valor_reserva, fecha, eventoResult.insertId, id_usuario]
    );

    await connection.commit();
    res.status(201).json({
      mensaje: 'Reserva creada exitosamente.',
      reserva: {
        id_reserva: reservaResult.insertId,
        fecha,
        hora_inicio,
        hora_fin,
        valor_reserva,
        estado: 'pendiente',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creando reserva:', error);
    res.status(500).json({ mensaje: 'Error al crear la reserva.' });
  } finally {
    connection.release();
  }
};

// ── GET /api/reservas ────────────────────────────────
const obtenerReservas = async (req, res) => {
  try {
    const esAdmin = req.usuario.id_rol === 1;
    let query = `
      SELECT r.id_reserva, r.valor_reserva, r.fecha_reserva,
             er.nombre_estado,
             u.nombre AS nombre_usuario, u.correo, u.telefono,
             e.fecha, e.hora_inicio, e.hora_fin,
             esp.nombre AS espacio,
             te.nombre AS tipo_evento,
             CONCAT(o.nombre, ' ', o.apellido) AS organizador
      FROM Reservas r
      JOIN Estado_reserva er ON r.id_estado_reserva = er.id_estado_reserva
      JOIN Usuarios u        ON r.id_usuario        = u.id_usuario
      LEFT JOIN Eventos e    ON r.id_evento          = e.id_evento
      LEFT JOIN Espacios esp ON e.id_espacio         = esp.id_espacio
      LEFT JOIN Tipo_Evento te ON e.id_tipo_evento   = te.id_tipo_evento
      LEFT JOIN Organizadores o ON e.id_organizador  = o.id_organizador
    `;
    const params = [];
    if (!esAdmin) {
      query += ' WHERE r.id_usuario = ?';
      params.push(req.usuario.id);
    }
    query += ' ORDER BY r.fecha_reserva DESC';

    const [reservas] = await pool.query(query, params);
    res.json(reservas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener reservas.' });
  }
};

// ── GET /api/reservas/:id ────────────────────────────
const obtenerReservaPorId = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, er.nombre_estado, er.descripcion AS desc_estado,
              u.nombre AS nombre_usuario, u.correo, u.telefono,
              e.fecha, e.hora_inicio, e.hora_fin,
              esp.nombre AS espacio, esp.aforo, esp.ubicacion,
              te.nombre AS tipo_evento,
              CONCAT(o.nombre, ' ', o.apellido) AS organizador
       FROM Reservas r
       JOIN Estado_reserva er ON r.id_estado_reserva = er.id_estado_reserva
       JOIN Usuarios u        ON r.id_usuario = u.id_usuario
       LEFT JOIN Eventos e    ON r.id_evento = e.id_evento
       LEFT JOIN Espacios esp ON e.id_espacio = esp.id_espacio
       LEFT JOIN Tipo_Evento te ON e.id_tipo_evento = te.id_tipo_evento
       LEFT JOIN Organizadores o ON e.id_organizador = o.id_organizador
       WHERE r.id_reserva = ?`,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ mensaje: 'Reserva no encontrada.' });

    const reserva = rows[0];
    if (req.usuario.id_rol !== 1 && reserva.id_usuario !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    res.json(reserva);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener la reserva.' });
  }
};

// ── PUT /api/reservas/:id/estado ─────────────────────
const cambiarEstadoReserva = async (req, res) => {
  try {
    const { id_estado_reserva } = req.body;

    const [rows] = await pool.query('SELECT * FROM Reservas WHERE id_reserva = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Reserva no encontrada.' });

    const reserva = rows[0];
    if (req.usuario.id_rol !== 1) {
      // El cliente solo puede cancelar (estado 3) su propia reserva
      if (reserva.id_usuario !== req.usuario.id || id_estado_reserva !== 3) {
        return res.status(403).json({ mensaje: 'Solo puedes cancelar tus propias reservas.' });
      }
    }

    await pool.query('UPDATE Reservas SET id_estado_reserva = ? WHERE id_reserva = ?', [
      id_estado_reserva,
      req.params.id,
    ]);
    res.json({ mensaje: 'Estado de reserva actualizado.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar la reserva.' });
  }
};

// ── GET /api/reservas/catalogo (tablas auxiliares) ───
const obtenerCatalogo = async (req, res) => {
  try {
    const [espacios]    = await pool.query('SELECT * FROM Espacios');
    const [tiposEvento] = await pool.query('SELECT * FROM Tipo_Evento');
    const [estados]     = await pool.query('SELECT * FROM Estado_reserva');
    res.json({ espacios, tiposEvento, estados });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener catálogo.' });
  }
};

module.exports = {
  verificarDisponibilidad,
  crearReserva,
  obtenerReservas,
  obtenerReservaPorId,
  cambiarEstadoReserva,
  obtenerCatalogo,
};