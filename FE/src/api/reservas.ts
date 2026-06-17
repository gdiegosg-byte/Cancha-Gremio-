import api from './client';

export interface ReservationResponse {
  id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: string;
}

export interface ReservationCreate {
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time: string;
}

export const reservasApi = {
  // GET /api/v1/reservations
  getAll: () =>
    api.get<ReservationResponse[]>('/api/v1/reservations'),

  // GET /api/v1/reservations/:id
  getById: (id: number) =>
    api.get<ReservationResponse>(`/api/v1/reservations/${id}`),

  // POST /api/v1/reservations
  create: (data: ReservationCreate) =>
    api.post<ReservationResponse>('/api/v1/reservations', data),
};