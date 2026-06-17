import api from './client';

// =============================================
// Fields/Canchas API
// =============================================

export interface FieldResponse {
    id: number;
    name: string;
    description: string;
    price_per_hour: number;
    surface_type: string;
    capacity: number;
    length_meters: number;
    width_meters: number;
    available_hour_start: string;
    available_hour_end: string;
    is_active: boolean;
    created_at: string;
}

export interface FieldCreate {
    name: string;
    description?: string;
    price_per_hour: number;
    surface_type?: string;
    capacity?: number;
    length_meters?: number;
    width_meters?: number;
}

export const fieldsApi = {
    // GET /api/v1/fields — obtener todas las canchas activas
    getAll: () =>
        api.get<FieldResponse[]>('/api/v1/fields'),

    // GET /api/v1/fields/:id
    getById: (id: number) =>
        api.get<FieldResponse>(`/api/v1/fields/${id}`),

    // POST /api/v1/fields
    create: (data: FieldCreate) =>
        api.post<FieldResponse>('/api/v1/fields', data),
};
