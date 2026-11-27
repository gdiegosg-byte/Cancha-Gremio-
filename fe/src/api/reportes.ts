import api from './client';
import type { DashboardStats } from '@/types';

export type { DashboardStats };

export interface ReporteParams {
  year: number;
  month: number;
  field_id?: number;
  estado?: string;
}

export interface ReporteResumen {
  total_reservas: number;
  confirmadas: number;
  pendientes: number;
  canceladas: number;
  ingresos_confirmados: number;
}

export interface ReporteReserva {
  id: number;
  cancha: number;
  cliente: string;
  email: string;
  telefono: string;
  inicio: string;
  fin: string;
  precio: number;
  estado: string;
  pago: string;
}

export interface ReporteResponse {
  periodo: { year: number; month: number; mes: string; desde: string };
  filtros: { field_id: number | null; estado: string | null };
  resumen: ReporteResumen;
  reservas: ReporteReserva[];
}

export const reportesApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getReporte: (params: ReporteParams) =>
    api.get<ReporteResponse>('/dashboard/reporte', { params }),
  exportCsv: async (params: ReporteParams) => {
    const response = await api.get<Blob>('/dashboard/export', {
      params,
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename=(.+)/);
    const filename = match?.[1] ?? `reporte-${params.year}-${String(params.month).padStart(2, '0')}.csv`;
    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
