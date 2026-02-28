const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const { pagosRouter, adminRouter } = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── RUTAS ───────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/pagos',    pagosRouter);
app.use('/api/admin',    adminRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', proyecto: '⚽ Cancha Gremio', version: '1.0.0' });
});

app.use('*', (req, res) => {
  res.status(404).json({ mensaje: `Ruta ${req.originalUrl} no encontrada.` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ mensaje: 'Error interno del servidor.' });
});

// ─── INICIAR ─────────────────────────────────────────
const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log('');
    console.log('⚽  CANCHA GREMIO - BACKEND');
    console.log('─────────────────────────────────');
    console.log(`🚀  Servidor en http://localhost:${PORT}`);
    console.log(`🌍  Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('📋  Endpoints:');
    console.log('    POST  /api/auth/registro');
    console.log('    POST  /api/auth/login');
    console.log('    GET   /api/reservas/disponibilidad?fecha=YYYY-MM-DD');
    console.log('    POST  /api/reservas');
    console.log('    POST  /api/pagos');
    console.log('    GET   /api/admin/reporte');
    console.log('─────────────────────────────────');
  });
};

startServer();