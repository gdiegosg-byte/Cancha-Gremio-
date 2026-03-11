-- Que: Agrega las columnas necesarias para el reset de contraseña
-- Para que: La tabla Usuarios pueda guardar el token y su expiración
-- Cómo ejecutar: En tu cliente de PostgreSQL (DBeaver, TablePlus, psql, etc.)
-- IMPORTANTE: Ejecutar UNA SOLA VEZ

ALTER TABLE Usuarios
  ADD COLUMN IF NOT EXISTS reset_token        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_token_expira TIMESTAMP;
