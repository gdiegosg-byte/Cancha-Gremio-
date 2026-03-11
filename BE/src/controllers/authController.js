const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { pool } = require('../config/database');

// ── POST /api/auth/registro ──────────────────────────
const registro = async (req, res) => {
  try {
    const { nombre, correo, telefono, direccion, contraseña, fecha_nacimiento, id_tipo_documento } = req.body;

    const [existe] = await pool.query('SELECT id_usuario FROM Usuarios WHERE correo = ?', [correo]);
    if (existe.length > 0) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(contraseña, salt);

    const [result] = await pool.query(
      `INSERT INTO Usuarios (nombre, correo, telefono, direccion, contraseña, fecha_nacimiento, id_tipo_documento, id_rol)
       VALUES (?, ?, ?, ?, ?, ?, ?, 2)`,
      [nombre, correo, telefono || null, direccion || null, hash, fecha_nacimiento || null, id_tipo_documento || null]
    );

    const token = jwt.sign({ id: result.insertId, id_rol: 2 }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({
      mensaje: '¡Registro exitoso!',
      token,
      usuario: { id_usuario: result.insertId, nombre, correo, id_rol: 2 },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// ── POST /api/auth/login ─────────────────────────────
const login = async (req, res) => {
  try {
    const { correo, contraseña } = req.body;

    const [rows] = await pool.query(
      `SELECT u.*, r.nombre_rol FROM Usuarios u
       JOIN Rol r ON u.id_rol = r.id_rol
       WHERE u.correo = ?`,
      [correo]
    );
    if (rows.length === 0) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    const usuario = rows[0];
    if (usuario.estado === 'inactivo') {
      return res.status(401).json({ mensaje: 'Cuenta desactivada. Contacta al administrador.' });
    }

    const valida = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!valida) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, id_rol: usuario.id_rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      mensaje: '¡Bienvenido!',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        telefono: usuario.telefono,
        id_rol: usuario.id_rol,
        nombre_rol: usuario.nombre_rol,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// ── GET /api/auth/perfil ─────────────────────────────
const perfil = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.telefono, u.direccion,
              u.fecha_registro, u.fecha_nacimiento, u.estado,
              r.nombre_rol, td.nombre_documento
       FROM Usuarios u
       JOIN Rol r ON u.id_rol = r.id_rol
       LEFT JOIN Tipo_documento td ON u.id_tipo_documento = td.id_tipo_documento
       WHERE u.id_usuario = ?`,
      [req.usuario.id]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener perfil.' });
  }
};

// ── PUT /api/auth/perfil ─────────────────────────────
const actualizarPerfil = async (req, res) => {
  try {
    const { nombre, telefono, direccion, fecha_nacimiento, id_tipo_documento } = req.body;
    await pool.query(
      `UPDATE Usuarios SET nombre=?, telefono=?, direccion=?, fecha_nacimiento=?, id_tipo_documento=?
       WHERE id_usuario=?`,
      [nombre, telefono, direccion, fecha_nacimiento, id_tipo_documento, req.usuario.id]
    );
    res.json({ mensaje: 'Perfil actualizado correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar perfil.' });
  }
};

// ── POST /api/auth/forgot-password ───────────────────
const forgotPassword = async (req, res) => {
  try {
    const { correo } = req.body;

    const [rows] = await pool.query(
      'SELECT id_usuario FROM Usuarios WHERE correo = $1', [correo]
    );
    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Correo no encontrado.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 3600000);

    await pool.query(
      'UPDATE Usuarios SET reset_token = $1, reset_token_expira = $2 WHERE correo = $3',
      [token, expira, correo]
    );

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: correo,
      subject: 'Recuperar contraseña - Cancha Gremio',
      html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>Este enlace expira en 1 hora.</p>`,
    });

    res.json({ mensaje: 'Correo de recuperación enviado.' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

// ── POST /api/auth/reset-password/:token ─────────────
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { contraseña } = req.body;

    const [rows] = await pool.query(
      'SELECT id_usuario FROM Usuarios WHERE reset_token = $1 AND reset_token_expira > NOW()',
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ mensaje: 'Token inválido o expirado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(contraseña, salt);

    await pool.query(
      'UPDATE Usuarios SET contraseña = $1, reset_token = NULL, reset_token_expira = NULL WHERE reset_token = $2',
      [hash, token]
    );

    res.json({ mensaje: 'Contraseña restablecida correctamente.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
};

module.exports = { registro, login, perfil, actualizarPerfil, forgotPassword, resetPassword };