// BE/src/routes/passwordReset.js
// Que: Rutas para solicitar y confirmar el restablecimiento de contraseña
// Para que: El usuario pueda recuperar acceso si olvidó su contraseña
// Endpoints:
//   POST /api/auth/forgot-password  → recibe email, envía link
//   POST /api/auth/reset-password   → recibe token + nueva contraseña

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

const router = express.Router();

// ── CONFIGURACIÓN DE EMAIL ────────────────────────────────────
// Que: Crea el transporte SMTP con las variables del .env
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── POST /api/auth/forgot-password ───────────────────────────
// Que: Genera un token y lo envía al correo del usuario
router.post('/forgot-password', async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ mensaje: 'El correo es requerido.' });
    }

    // Buscar usuario por correo
    const result = await pool.query(
      'SELECT id_usuario, nombre, correo FROM Usuarios WHERE correo = $1',
      [correo]
    );

    // Responder igual exista o no el correo (seguridad: no revelar si está registrado)
    if (result.rows.length === 0) {
      return res.status(200).json({
        mensaje: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      });
    }

    const usuario = result.rows[0];

    // Generar token aleatorio seguro
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hashear el token antes de guardarlo en la BD
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Expiración: 1 hora desde ahora
    const expiracion = new Date(Date.now() + 60 * 60 * 1000);

    // Guardar token hasheado y expiración en la BD
    await pool.query(
      'UPDATE Usuarios SET reset_token = $1, reset_token_expira = $2 WHERE id_usuario = $3',
      [hashedToken, expiracion, usuario.id_usuario]
    );

    // Construir link para el frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Enviar email con el link
    await transporter.sendMail({
      from: `"Cancha Gremio" <${process.env.EMAIL_USER}>`,
      to: usuario.correo,
      subject: '🔐 Restablece tu contraseña - Cancha Gremio',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 500px; margin: 40px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: #16a34a; padding: 30px; text-align: center; }
              .header h1 { color: #fff; margin: 0; font-size: 22px; }
              .body { padding: 30px; }
              .body p { color: #444; line-height: 1.6; }
              .btn { display: block; width: fit-content; margin: 24px auto; padding: 14px 32px; background: #16a34a; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
              .footer { text-align: center; padding: 16px; font-size: 12px; color: #999; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header"><h1>⚽ Cancha Gremio</h1></div>
              <div class="body">
                <p>Hola <strong>${usuario.nombre}</strong>,</p>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                <p>Haz clic en el botón — este enlace expira en <strong>1 hora</strong>.</p>
                <a href="${resetLink}" class="btn">Restablecer contraseña</a>
                <p>Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.</p>
              </div>
              <div class="footer"><p>© 2026 Cancha Gremio. Correo automático.</p></div>
            </div>
          </body>
        </html>
      `,
    });

    return res.status(200).json({
      mensaje: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
    });

  } catch (error) {
    console.error('[forgot-password] Error:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
// Que: Verifica el token y actualiza la contraseña en la BD
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ mensaje: 'Token y contraseña son requeridos.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    // Hashear el token recibido para comparar con el de la BD
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar usuario con ese token que no haya expirado
    const result = await pool.query(
      'SELECT id_usuario FROM Usuarios WHERE reset_token = $1 AND reset_token_expira > NOW()',
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        mensaje: 'El enlace es inválido o ha expirado. Solicita uno nuevo.',
      });
    }

    const usuario = result.rows[0];

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Actualizar contraseña y limpiar el token (ya no se puede usar)
    await pool.query(
      'UPDATE Usuarios SET contrasena = $1, reset_token = NULL, reset_token_expira = NULL WHERE id_usuario = $2',
      [hashedPassword, usuario.id_usuario]
    );

    return res.status(200).json({
      mensaje: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.',
    });

  } catch (error) {
    console.error('[reset-password] Error:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});

module.exports = router;
