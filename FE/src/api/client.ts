import axios from 'axios';

// =============================================
// API Client — apunta al BE en puerto 3001
// =============================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Request interceptor — adjunta token JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem('cg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — maneja errores globales
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cg_token');
      localStorage.removeItem('cg_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;