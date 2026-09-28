import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));

import {
  confirmarImagen,
  consultaDeLaLista,
  ejecutarAccion,
  guardarChecklist,
  guardarContenidoDeLaCaja,
  leerMiCaja,
  listarCajas,
  marcarEntregada,
  marcarEnviada,
  pedirSubidaDeImagen,
  reportarProblema,
} from '../cajaApi';

/** El contrato de la Caja Renaser (spec §9), tal como lo usa la app: rutas, métodos y cuerpos. */

const DETALLE = { aprendizId: 'a-1', estado: 'ARMANDO', faltaParaEnviar: ['FOTO'] };

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(DETALLE);
});

describe('la lista', () => {
  it('manda solo los filtros con valor, codificados', () => {
    expect(consultaDeLaLista({ estado: 'POR_REVISAR', q: ' José ', page: 0, size: 30 })).toBe(
      '?estado=POR_REVISAR&q=Jos%C3%A9&page=0&size=30',
    );
    expect(consultaDeLaLista({})).toBe('');
  });

  it('acepta conteos y un item sin campos opcionales', async () => {
    mockApiFetch.mockResolvedValue({
      items: [{ aprendizId: 'a-1', estado: 'POR_REVISAR' }],
      total: 1,
      conteos: { POR_REVISAR: 1, ENVIADA: 4 },
    });
    const lista = await listarCajas({ estado: 'POR_REVISAR' });
    expect(lista.conteos?.ENVIADA).toBe(4);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/caja?estado=POR_REVISAR', undefined);
  });
});

describe('las acciones del Admin', () => {
  it('aprobar, armar y reenviar son un POST sin cuerpo', async () => {
    await ejecutarAccion('a-1', 'aprobar');
    await ejecutarAccion('a-1', 'armar');
    await ejecutarAccion('a/2', 'reenviar');
    expect(mockApiFetch.mock.calls.map(c => [c[0], c[1]?.method])).toEqual([
      ['/api/v1/admin/caja/a-1/aprobar', 'POST'],
      ['/api/v1/admin/caja/a-1/armar', 'POST'],
      ['/api/v1/admin/caja/a%2F2/reenviar', 'POST'],
    ]);
  });

  it('enviar lleva medio, courier, código y costo', async () => {
    await marcarEnviada('a-1', { medio: 'Courier', courier: 'Olva', codigo: 'OL-1', costo: 15.5 });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/caja/a-1/enviar', {
      method: 'POST',
      body: { medio: 'Courier', courier: 'Olva', codigo: 'OL-1', costo: 15.5 },
    });
  });

  it('entregada lleva `previa` solo para «Ya se envió antes»', async () => {
    await marcarEntregada('a-1');
    await marcarEntregada('a-1', true);
    expect(mockApiFetch.mock.calls.map(c => c[1]?.body)).toEqual([{}, { previa: true }]);
  });

  it('problema lleva motivo y nota', async () => {
    await reportarProblema('a-1', { motivo: 'DANADA', nota: 'Caja mojada' });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/caja/a-1/problema', {
      method: 'POST',
      body: { motivo: 'DANADA', nota: 'Caja mojada' },
    });
  });

  it('el checklist es un PUT con los marcados', async () => {
    await guardarChecklist('a-1', ['LIBRETA']);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/caja/a-1/contenido', { method: 'PUT', body: { marcados: ['LIBRETA'] } });
  });

  it('la foto y el comprobante suben en dos pasos y se confirman con la ruta', async () => {
    mockApiFetch.mockResolvedValueOnce({ url: 'https://s3/put', ruta: 'r/1' });
    expect(await pedirSubidaDeImagen('a-1', 'comprobante', 'image/jpeg')).toEqual({ url: 'https://s3/put', ruta: 'r/1' });
    await confirmarImagen('a-1', 'comprobante', 'r/1');
    expect(mockApiFetch.mock.calls.map(c => [c[0], c[1]?.body])).toEqual([
      ['/api/v1/admin/caja/a-1/comprobante/upload-url', { contentType: 'image/jpeg' }],
      ['/api/v1/admin/caja/a-1/comprobante/confirm', { ruta: 'r/1' }],
    ]);
  });

  it('una respuesta que no es un detalle se rechaza con el nombre del endpoint', async () => {
    mockApiFetch.mockResolvedValue({ hola: 1 });
    await expect(ejecutarAccion('a-1', 'armar')).rejects.toThrow('POST /api/v1/admin/caja/{id}/armar');
  });
});

describe('el contenido de la caja', () => {
  it('si el servidor responde vacío, queda lo que se mandó', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    const elementos = [{ valor: 'TAZA', etiqueta: 'Taza' }];
    expect(await guardarContenidoDeLaCaja(elementos)).toEqual({ elementos });
  });
});

describe('la caja del aprendiz', () => {
  it('acepta pasos y envío ausentes', async () => {
    mockApiFetch.mockResolvedValue({ estado: 'EN_EVALUACION' });
    expect((await leerMiCaja()).estado).toBe('EN_EVALUACION');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/me/caja', undefined);
  });
});
