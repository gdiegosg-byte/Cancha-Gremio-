import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const adminUser = {
  id_usuario: 3,
  nombre: 'Ana',
  correo: 'ana@test.com',
  telefono: '3001234567',
  nombre_rol: 'admin',
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

describe('AuthProvider', () => {
  it('useAuth falla fuera del provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
    consoleError.mockRestore();
  });

  it('restaura una sesión guardada', async () => {
    localStorage.setItem('cg_token', 'token-guardado');
    localStorage.setItem('cg_user', JSON.stringify({ id: '3', rol: 'admin', email: 'ana@test.com' }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user?.rol).toBe('admin');
  });

  it('inicia sesión y guarda los tokens', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'access', refresh_token: 'refresh', usuario: adminUser }),
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('ana@test.com', 'Password1!');
    });

    expect(localStorage.getItem('cg_token')).toBe('access');
    expect(localStorage.getItem('cg_refresh')).toBe('refresh');
    expect(result.current.user?.email).toBe('ana@test.com');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('muestra el error del backend si el login falla', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Credenciales incorrectas' }),
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await expect(result.current.login('ana@test.com', 'mala')).rejects.toThrow('Credenciales incorrectas');
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('cierra la sesión y limpia el almacenamiento local', async () => {
    localStorage.setItem('cg_token', 'access');
    localStorage.setItem('cg_user', JSON.stringify({ id: '3', rol: 'admin' }));
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.logout());

    expect(localStorage.getItem('cg_token')).toBeNull();
    expect(localStorage.getItem('cg_user')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/logout'), expect.anything());
  });

  it('cierra todas las sesiones', async () => {
    localStorage.setItem('cg_token', 'access');
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.logoutAll());

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/logout-all'), expect.anything());
  });

  it('actualiza el usuario en contexto y en localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const updated = {
      id: '3',
      nombre: 'Ana',
      apellido: '',
      email: 'ana@test.com',
      telefono: '3001234567',
      rol: 'admin' as const,
      createdAt: '2026-01-01',
    };

    act(() => result.current.updateUser(updated));

    expect(result.current.user).toEqual(updated);
    expect(JSON.parse(localStorage.getItem('cg_user') ?? 'null')).toEqual(updated);
  });
});
