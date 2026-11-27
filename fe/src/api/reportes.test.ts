import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './client';
import { reportesApi } from './reportes';

vi.mock('./client', () => ({
  default: { get: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);

beforeEach(() => {
  mockedGet.mockReset();
});

describe('reportesApi', () => {
  it('obtiene las estadísticas del dashboard', async () => {
    const stats = { clientesRegistrados: 7 };
    mockedGet.mockResolvedValue({ data: stats } as never);

    const response = await reportesApi.getStats();

    expect(mockedGet).toHaveBeenCalledWith('/dashboard/stats');
    expect(response.data).toEqual(stats);
  });

  it('envía año, mes y filtros al reporte', async () => {
    mockedGet.mockResolvedValue({ data: {} } as never);

    await reportesApi.getReporte({ year: 2026, month: 3, estado: 'confirmed', field_id: 2 });

    expect(mockedGet).toHaveBeenCalledWith('/dashboard/reporte', {
      params: { year: 2026, month: 3, estado: 'confirmed', field_id: 2 },
    });
  });

  it('descarga el CSV con el nombre devuelto por el backend', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mockedGet.mockResolvedValue({
      data: new Blob(['id,cliente'], { type: 'text/csv' }),
      headers: { 'content-disposition': 'attachment; filename=reporte-2026-03.csv' },
    } as never);

    await reportesApi.exportCsv({ year: 2026, month: 3 });

    expect(mockedGet).toHaveBeenCalledWith('/dashboard/export', {
      params: { year: 2026, month: 3 },
      responseType: 'blob',
    });
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('usa un nombre por defecto si no hay content-disposition', async () => {
    let downloadedName = '';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.download;
    });
    mockedGet.mockResolvedValue({ data: new Blob(['']), headers: {} } as never);

    await reportesApi.exportCsv({ year: 2026, month: 12 });

    expect(downloadedName).toBe('reporte-2026-12.csv');
  });

  it('propaga errores de la API', async () => {
    mockedGet.mockRejectedValue(new Error('sin conexión'));
    await expect(reportesApi.getStats()).rejects.toThrow('sin conexión');
  });
});
