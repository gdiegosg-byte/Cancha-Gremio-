import api from './client';
import { Evento, DashboardStats, Mantenimiento } from '@/types';

// =============================================
// Eventos API
// =============================================

export const eventosApi = {
  getAll: () => api.get<Evento[]>('/eventos'),
  getById: (id: string) => api.get<Evento>(`/eventos/${id}`),
  create: (data: Omit<Evento, 'id'>) => api.post<Evento>('/eventos', data),
  update: (id: string, data: Partial<Evento>) => api.put<Evento>(`/eventos/${id}`, data),
  delete: (id: string) => api.delete(`/eventos/${id}`),
};

// =============================================
// Dashboard API
// =============================================

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getReporteMensual: (year: number, month: number) =>
    api.get('/dashboard/reporte', { params: { year, month } }),
  exportReporte: (year: number, month: number) =>
    api.get('/dashboard/export', { params: { year, month }, responseType: 'blob' }),
};

// =============================================
// Mantenimiento API
// =============================================

export const mantenimientoApi = {
  getAll: () => api.get<Mantenimiento[]>('/mantenimiento'),
  create: (data: Omit<Mantenimiento, 'id'>) => api.post<Mantenimiento>('/mantenimiento', data),
  delete: (id: string) => api.delete(`/mantenimiento/${id}`),
};
