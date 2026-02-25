import api from './client';
import { Reserva, PaginatedResponse } from '@/types';

// =============================================
// Reservas API
// =============================================

export interface CreateReservaDto {
  clienteId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cancha: number;
  metodoPago?: string;
  notas?: string;
}

export const reservasApi = {
  getAll: (params?: { page?: number; limit?: number; estado?: string; fecha?: string }) =>
    api.get<PaginatedResponse<Reserva>>('/reservas', { params }),

  getById: (id: string) =>
    api.get<Reserva>(`/reservas/${id}`),

  create: (dto: CreateReservaDto) =>
    api.post<Reserva>('/reservas', dto),

  confirm: (id: string) =>
    api.patch<Reserva>(`/reservas/${id}/confirmar`),

  cancel: (id: string, motivo?: string) =>
    api.patch<Reserva>(`/reservas/${id}/cancelar`, { motivo }),

  getDisponibilidad: (fecha: string, cancha: number) =>
    api.get<{ hora: string; disponible: boolean }[]>('/reservas/disponibilidad', {
      params: { fecha, cancha },
    }),

  getByCliente: (clienteId: string) =>
    api.get<Reserva[]>(`/reservas/cliente/${clienteId}`),
};
