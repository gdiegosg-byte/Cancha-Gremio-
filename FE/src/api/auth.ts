import api from './client';
import { User } from '@/types';

// =============================================
// Auth API — campos adaptados al BE
// BE usa: correo, contraseña, nombre_rol, id_rol
// =============================================

export const authApi = {

  // POST /api/auth/login
  login: (email: string, password: string) =>
    api.post<{ token: string; usuario: { id_usuario: number; nombre: string; correo: string; id_rol: number; nombre_rol: string } }>(
      '/api/v1/auth/login',
      { correo: email, password: password }   // BE espera correo/contraseña
    ),

  // POST /api/auth/registro  ← BE usa /registro no /register
  register: (data: {
    nombre: string;
    correo: string;
    contraseña: string;
    telefono?: string;
    direccion?: string;
    fecha_nacimiento?: string;
    id_tipo_documento?: number;
  }) => api.post<{ token: string; usuario: { id_usuario: number; nombre: string; correo: string; id_rol: number } }>(
    '/api/auth/registro',
    data
  ),

  // GET /api/auth/perfil  ← BE usa /perfil no /me
  me: () =>
    api.get<{
      id_usuario: number; nombre: string; correo: string;
      telefono: string; direccion: string; nombre_rol: string;
    }>('/api/auth/perfil'),

  // PUT /api/auth/perfil
  updatePerfil: (data: {
    nombre?: string; telefono?: string; direccion?: string;
    fecha_nacimiento?: string; id_tipo_documento?: number;
  }) => api.put('/api/auth/perfil', data),
  // POST /api/auth/forgot-password
  forgotPassword: (correo: string) =>
    api.post('/api/auth/forgot-password', { correo }),

  // POST /api/auth/reset-password/:token
  resetPassword: (token: string, contraseña: string) =>
    api.post(`/api/auth/reset-password/${token}`, { contraseña }),
};

// =============================================
// Users/Clientes API — usa /api/admin/clientes
// =============================================

export const usersApi = {

  // GET /api/admin/clientes  ← solo admin
  getAll: () =>
    api.get<{
      id_usuario: number; nombre: string; correo: string;
      telefono: string; estado: string; fecha_registro: string;
      total_reservas: number;
    }[]>('/api/admin/clientes'),

  // PUT /api/admin/clientes/:id/estado
  toggleEstado: (id: number, estado: 'activo' | 'inactivo') =>
    api.put(`/api/admin/clientes/${id}/estado`, { estado }),
};