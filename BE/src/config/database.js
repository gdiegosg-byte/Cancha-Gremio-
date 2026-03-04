// BE/src/config/database.js
// Que: Conexion a PostgreSQL usando pg (node-postgres)
// Para que: Proveer pool de conexiones a todos los controllers
// Impacto: Los controllers usan pool.query() — misma API que mysql2

const { Pool } = require('pg');
require('dotenv').config();

// Pool de conexiones PostgreSQL
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5433'),
  user:     process.env.DB_USER     || 'cancha_user',
  password: process.env.DB_PASSWORD || 'cancha_password',
  database: process.env.DB_NAME     || 'cancha_sintetica_db',
  max: 10,                // maximo de conexiones simultaneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ── ADAPTADOR: hace que pool.query() devuelva [rows, fields]
// igual que mysql2, para no tocar los controllers existentes
const originalQuery = pool.query.bind(pool);

const poolAdapter = {
  // pool.query(sql, params) → devuelve [rows, fields] como mysql2
  query: async (sql, params) => {
    // Convertir placeholders de MySQL (?) a PostgreSQL ($1, $2, ...)
    let pgSql = sql;
    let i = 0;
    pgSql = pgSql.replace(/\?/g, () => `$${++i}`);

    const result = await originalQuery(pgSql, params);
    return [result.rows, result.fields];
  },

  // pool.getConnection() para transacciones (usado en pagos y reservas)
  getConnection: async () => {
    const client = await pool.connect();
    return {
      query: async (sql, params) => {
        let pgSql = sql;
        let i = 0;
        pgSql = pgSql.replace(/\?/g, () => `$${++i}`);
        const result = await client.query(pgSql, params);
        return [result.rows, result.fields];
      },
      beginTransaction: () => client.query('BEGIN'),
      commit:           () => client.query('COMMIT'),
      rollback:         () => client.query('ROLLBACK'),
      release:          () => client.release(),
    };
  },
};

// ── TEST DE CONEXION al arrancar el servidor
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as now');
    client.release();
    console.log('✅  PostgreSQL conectado:', res.rows[0].now);
  } catch (error) {
    console.error('❌  Error conectando a PostgreSQL:', error.message);
    console.error('    Verifica que Docker esté corriendo: docker compose up -d');
    process.exit(1);
  }
};

module.exports = { pool: poolAdapter, testConnection };
