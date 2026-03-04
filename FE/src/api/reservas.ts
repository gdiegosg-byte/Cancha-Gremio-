import api from './client';

// =============================================
// Reservas API — campos adaptados al BE
// BE usa: fecha, hora_inicio, hora_fin, id_espacio, id_tipo_evento
// =============================================

export interface CreateReservaDto {
  fecha:           string;   // 'YYYY-MM-DD'
  hora_inicio:     string;   // 'HH:MM'
  hora_fin:        string;   // 'HH:MM'
  id_espacio?:     number;   // default 1
  id_tipo_evento?: number;   // default 1
  id_organizador?: number;
}

export interface ReservaResponse {
  id_reserva:    number;
  valor_reserva: number;
  fecha_reserva: string;
  nombre_estado: string;
  nombre_usuario: string;
  correo:        string;
  telefono:      string;
  fecha:         string;
  hora_inicio:   string;
  hora_fin:      string;
  espacio:       string;
  tipo_evento:   string;
  organizador:   string;
}

export interface SlotDisponibilidad {
  hora:       string;
  disponible: boolean;
}

export const reservasApi = {

  // GET /api/reservas  → admin ve todas, cliente las suyas
  getAll: (params?: { estado?: string; fecha?: string }) =>
    api.get<ReservaResponse[]>('/api/reservas', { params }),

  // GET /api/reservas/:id
  getById: (id: number) =>
    api.get<ReservaResponse>(`/api/reservas/${id}`),

  // POST /api/reservas
  create: (dto: CreateReservaDto) =>
    api.post<{ mensaje: string; reserva: { id_reserva: number; valor_reserva: number; estado: string } }>(
      '/api/reservas', dto
    ),

  // PUT /api/reservas/:id/estado
  cambiarEstado: (id: number, id_estado_reserva: number) =>
    api.put(`/api/reservas/${id}/estado`, { id_estado_reserva }),

  // GET /api/reservas/disponibilidad?fecha=YYYY-MM-DD
  getDisponibilidad: (fecha: string) =>
    api.get<{ fecha: string; horario: SlotDisponibilidad[] }>(
      '/api/reservas/disponibilidad', { params: { fecha } }
    ),

  // GET /api/reservas/catalogo → espacios, tipos evento, estados
  getCatalogo: () =>
    api.get<{
      espacios:    { id_espacio: number; nombre: string; aforo: number }[];
      tiposEvento: { id_tipo_evento: number; nombre: string }[];
      estados:     { id_estado_reserva: number; nombre_estado: string }[];
    }>('/api/reservas/catalogo'),
};