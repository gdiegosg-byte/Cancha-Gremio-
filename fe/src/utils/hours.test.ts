import { describe, expect, it } from 'vitest';
import { getHoursInRange } from './hours';

describe('getHoursInRange', () => {
  it('devuelve todas las horas del rango', () => {
    expect(getHoursInRange('08:00', '11:00')).toEqual(['08:00', '09:00', '10:00']);
  });

  it('devuelve una sola hora cuando el rango dura una hora', () => {
    expect(getHoursInRange('08:00', '09:00')).toEqual(['08:00']);
  });

  it('devuelve un arreglo vacío si falta el inicio', () => {
    expect(getHoursInRange(null, '10:00')).toEqual([]);
  });

  it('devuelve un arreglo vacío si falta el fin', () => {
    expect(getHoursInRange('08:00', undefined)).toEqual([]);
  });

  it('devuelve un arreglo vacío si el fin es menor al inicio', () => {
    expect(getHoursInRange('11:00', '08:00')).toEqual([]);
  });

  it('admite rangos que terminan en medianoche', () => {
    expect(getHoursInRange('22:00', '24:00')).toEqual(['22:00', '23:00']);
  });

  it('ignora los minutos', () => {
    expect(getHoursInRange('08:30', '10:45')).toEqual(['08:00', '09:00']);
  });
});
