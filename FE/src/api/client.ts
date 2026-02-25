import axios from 'axios';

// =============================================
// API Client
// =============================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Request interceptor — attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('cg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle errors
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
