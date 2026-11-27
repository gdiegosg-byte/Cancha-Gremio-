import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  todayLocal,
  toLocalDateString,
  toLocalTimeString,
  useAsync,
  useDebounce,
  useLocalStorage,
} from './index';

afterEach(() => {
  vi.useRealTimers();
});

describe('date helpers', () => {
  it('toLocalDateString rellena mes y día con ceros', () => {
    expect(toLocalDateString(new Date(2026, 2, 5, 12, 0))).toBe('2026-03-05');
  });

  it('toLocalTimeString rellena hora y minuto con ceros', () => {
    expect(toLocalTimeString(new Date(2026, 2, 5, 8, 7))).toBe('08:07');
  });

  it('todayLocal usa la fecha local', () => {
    const today = new Date();
    expect(todayLocal()).toBe(toLocalDateString(today));
  });
});

describe('useLocalStorage', () => {
  it('devuelve el valor inicial si no hay nada guardado', () => {
    const { result } = renderHook(() => useLocalStorage('cg_test', 'inicial'));
    expect(result.current[0]).toBe('inicial');
  });

  it('guarda el valor en localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('cg_test', 'inicial'));
    act(() => result.current[1]('guardado'));
    expect(result.current[0]).toBe('guardado');
    expect(JSON.parse(localStorage.getItem('cg_test') ?? 'null')).toBe('guardado');
  });

  it('acepta una función actualizadora', () => {
    const { result } = renderHook(() => useLocalStorage('cg_count', 1));
    act(() => result.current[1](prev => prev + 1));
    expect(result.current[0]).toBe(2);
  });
});

describe('useDebounce', () => {
  it('actualiza el valor después del retardo', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 'primero' },
    });

    rerender({ value: 'segundo' });
    expect(result.current).toBe('primero');

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('segundo');
  });
});

describe('useAsync', () => {
  it('expone datos y estado de carga', async () => {
    const { result } = renderHook(() => useAsync<number>());
    await act(async () => {
      await result.current.execute(Promise.resolve(42));
    });
    expect(result.current.data).toBe(42);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('guarda el mensaje de error', async () => {
    const { result } = renderHook(() => useAsync<number>());
    await act(async () => {
      await expect(result.current.execute(Promise.reject(new Error('falló')))).rejects.toThrow('falló');
    });
    await waitFor(() => expect(result.current.error).toBe('falló'));
    expect(result.current.data).toBeNull();
  });
});
