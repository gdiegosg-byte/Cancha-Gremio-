-- BE/src/config/schema.sql
-- Que: Crea todas las tablas del sistema en PostgreSQL
-- Para que: Inicializar la base de datos desde cero
-- Ejecutar: psql -h localhost -p 5433 -U cancha_user -d cancha_sintetica_db -f schema.sql

-- ── TABLAS DE CATALOGO ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS Rol (
  id_rol     SERIAL PRIMARY KEY,
  nombre_rol VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS Tipo_documento (
  id_tipo_documento SERIAL PRIMARY KEY,
  nombre_documento  VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS Estado_reserva (
  id_estado_reserva SERIAL PRIMARY KEY,
  nombre_estado     VARCHAR(50) NOT NULL,
  descripcion       TEXT
);

CREATE TABLE IF NOT EXISTS Espacios (
  id_espacio SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  aforo      INT,
  ubicacion  VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS Tipo_Evento (
  id_tipo_evento   SERIAL PRIMARY KEY,
  nombre           VARCHAR(100) NOT NULL,
  numero_personas  INT
);

CREATE TABLE IF NOT EXISTS Organizadores (
  id_organizador SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  apellido       VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Metodos_Pago (
  id_metodo_pago      SERIAL PRIMARY KEY,
  nombre_metodo       VARCHAR(100) NOT NULL,
  estado              VARCHAR(20) DEFAULT 'activo',
  icono               VARCHAR(100),
  monto               DECIMAL(12,2),
  numero_cuenta       VARCHAR(50),
  telefono_registrado VARCHAR(20),
  numer_tarjeta       VARCHAR(20),
  fecha_caducidad     VARCHAR(10),
  cvv                 VARCHAR(5),
  fecha_pago          TIMESTAMP
);

-- ── USUARIOS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS Usuarios (
  id_usuario        SERIAL PRIMARY KEY,
  nombre            VARCHAR(100) NOT NULL,
  correo            VARCHAR(150) NOT NULL UNIQUE,
  telefono          VARCHAR(20),
  direccion         VARCHAR(200),
  contraseña        VARCHAR(255) NOT NULL,
  fecha_registro    TIMESTAMP DEFAULT NOW(),
  fecha_nacimiento  DATE,
  estado            VARCHAR(20) DEFAULT 'activo',
  id_tipo_documento INT REFERENCES Tipo_documento(id_tipo_documento),
  id_rol            INT NOT NULL REFERENCES Rol(id_rol)
);

-- ── EVENTOS Y RESERVAS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS Eventos (
  id_evento      SERIAL PRIMARY KEY,
  fecha          DATE NOT NULL,
  hora_inicio    TIME NOT NULL,
  hora_fin       TIME NOT NULL,
  id_espacio     INT REFERENCES Espacios(id_espacio),
  id_tipo_evento INT REFERENCES Tipo_Evento(id_tipo_evento),
  id_usuario     INT REFERENCES Usuarios(id_usuario),
  id_organizador INT REFERENCES Organizadores(id_organizador)
);

CREATE TABLE IF NOT EXISTS Reservas (
  id_reserva        SERIAL PRIMARY KEY,
  valor_reserva     DECIMAL(12,2) NOT NULL,
  fecha_reserva     DATE NOT NULL,
  id_evento         INT REFERENCES Eventos(id_evento),
  id_usuario        INT NOT NULL REFERENCES Usuarios(id_usuario),
  id_estado_reserva INT NOT NULL REFERENCES Estado_reserva(id_estado_reserva)
);

-- ── PAGOS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS Pagos (
  id_pago        SERIAL PRIMARY KEY,
  valor_total    DECIMAL(12,2) NOT NULL,
  abono          DECIMAL(12,2),
  saldo_restante DECIMAL(12,2),
  estado         VARCHAR(20) DEFAULT 'pendiente',
  fecha_pago     TIMESTAMP DEFAULT NOW(),
  id_reserva     INT REFERENCES Reservas(id_reserva),
  id_metodo_pago INT REFERENCES Metodos_Pago(id_metodo_pago)
);

-- ── DATOS INICIALES ───────────────────────────────────────────

INSERT INTO Rol (nombre_rol) VALUES ('admin'), ('cliente')
  ON CONFLICT DO NOTHING;

INSERT INTO Tipo_documento (nombre_documento) VALUES ('Cédula de Ciudadanía'), ('Tarjeta de Identidad'), ('Pasaporte')
  ON CONFLICT DO NOTHING;

INSERT INTO Estado_reserva (nombre_estado, descripcion) VALUES
  ('pendiente',   'Reserva pendiente de confirmación'),
  ('confirmada',  'Reserva confirmada y pagada'),
  ('cancelada',   'Reserva cancelada'),
  ('completada',  'Reserva completada')
  ON CONFLICT DO NOTHING;

INSERT INTO Espacios (nombre, aforo, ubicacion) VALUES
  ('Cancha Principal', 14, 'Sector A - Planta baja')
  ON CONFLICT DO NOTHING;

INSERT INTO Tipo_Evento (nombre, numero_personas) VALUES
  ('Fútbol 7',  14),
  ('Fútbol 5',  10),
  ('Torneo',    20),
  ('Cumpleaños', 30)
  ON CONFLICT DO NOTHING;

INSERT INTO Metodos_Pago (nombre_metodo, icono) VALUES
  ('Efectivo',              '💵'),
  ('Tarjeta Débito/Crédito','💳'),
  ('Nequi',                 '📱'),
  ('Daviplata',             '📲'),
  ('Transferencia',         '🏦')
  ON CONFLICT DO NOTHING;

-- ── ADMIN POR DEFECTO ─────────────────────────────────────────
-- Contraseña: admin123 (bcrypt hash)
INSERT INTO Usuarios (nombre, correo, contraseña, id_rol) VALUES
  ('Administrador', 'admin@canchagremia.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1)
  ON CONFLICT (correo) DO NOTHING;
