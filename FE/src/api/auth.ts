import api from './client';
import { User, PaginatedResponse } from '@/types';

// =============================================
// Auth & Users API
// =============================================

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/login', { email, password }),

  register: (data: {
    nombre: string; apellido: string; email: string;
    password: string; telefono: string;
  }) => api.post<{ user: User; token: string }>('/auth/register', data),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get<User>('/auth/me'),

  refreshToken: () =>
    api.post<{ token: string }>('/auth/refresh'),
};

export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<User>>('/users', { params }),

  getById: (id: string) =>
    api.get<User>(`/users/${id}`),

  update: (id: string, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/users/${id}`),
};
