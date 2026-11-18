import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Linking } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));
const mockAlerta = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

import { ApiError } from '../../../../services/http/apiClient';
import { useDescargarSemana, type DocumentoQueSeDescarga } from '../useDescargarSemana';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * «Descargar semana» (spec 056 FR-039, FR-041, FR-047, T044): pide el documento al servidor y abre el enlace. Un toque, un pedido; el
 * motivo del servidor se dice tal cual.
 */
const ENLACE = 'https://almacen.example/reportes/p1/2026-11-14.html?firma=abc';
const respuesta = { url: ENLACE, venceEn: '2026-11-18T22:10:00Z', reutilizado: false, semana: { desde: '2026-11-14', hasta: '2026-11-20' } };

let api!: ReturnType<typeof useDescargarSemana>;
function Probador({ documento }: { documento: DocumentoQueSeDescarga }) {
  api = useDescargarSemana(documento);
  return null;
}
async function montar(documento: DocumentoQueSeDescarga = { tipo: 'APRENDIZ', personaId: 'p1' }): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(Probador, { documento }));
  });
  return r;
}

let abrir: jest.SpiedFunction<typeof Linking.openURL>;
beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(respuesta);
  mockAlerta.mockReset();
  abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

describe('descargar la semana', () => {
  it('pide el documento del aprendiz por la ruta de la persona y abre el enlace que devuelve el servidor', async () => { // spec 056 FR-047
    await montar();
    await act(async () => api.descargar());
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/people/p1/documento', { method: 'POST', body: { tipo: 'APRENDIZ' } });
    expect(abrir).toHaveBeenCalledWith(ENLACE);
    expect(mockAlerta).not.toHaveBeenCalled();
  });

  it('pide la semana que se está viendo cuando se le dice cuál (un viernes)', async () => { // spec 056 FR-039
    await montar();
    await act(async () => api.descargar('2026-11-13'));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/people/p1/documento', { method: 'POST', body: { tipo: 'APRENDIZ', semanaHasta: '2026-11-13' } });
  });

  it('el de un mentor sale por la ruta de mentores', async () => { // spec 056 FR-039
    await montar({ tipo: 'MENTOR', personaId: 'm1' });
    await act(async () => api.descargar());
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/mentors/m1/documento', { method: 'POST', body: {} });
    await act(async () => api.descargar('2026-11-13'));
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/leadership/mentors/m1/documento', { method: 'POST', body: { semanaHasta: '2026-11-13' } });
  });

  it('un id con «/» o «%» no cambia a qué ruta se llama', async () => { // spec 056 FR-039
    await montar({ tipo: 'APRENDIZ', personaId: 'a/b%c' });
    await act(async () => api.descargar());
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/leadership/people/a%2Fb%25c/documento');
  });
});

describe('un toque, un pedido', () => {
  it('mientras el documento se genera, otro toque no pide otro, y al terminar se puede volver a tocar', async () => { // spec 056 FR-047
    let terminar!: (v: unknown) => void;
    mockApiFetch.mockImplementation(() => new Promise(resolver => (terminar = resolver)));
    await montar();

    await act(async () => {
      void api.descargar();
      void api.descargar(); // dos toques en el mismo cuadro
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(api.descargando).toBe(true);

    await act(async () => terminar(respuesta));
    expect(api.descargando).toBe(false);
    expect(abrir).toHaveBeenCalledTimes(1);

    mockApiFetch.mockResolvedValue(respuesta);
    await act(async () => api.descargar());
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });
});

describe('cuando no se puede', () => {
  it('el motivo del servidor se muestra tal cual y no se abre nada', async () => { // spec 056 FR-041
    mockApiFetch.mockRejectedValue(new ApiError(403, 'Ya no acompañas a este aprendiz.', { codigo: 'NO_ACOMPANA' }));
    await montar();
    await act(async () => api.descargar());
    expect(mockAlerta).toHaveBeenCalledTimes(1);
    expect(mockAlerta.mock.calls[0][0]).toBe('No se pudo descargar la semana');
    expect(mockAlerta.mock.calls[0][1]).toBe('Ya no acompañas a este aprendiz.');
    expect(abrir).not.toHaveBeenCalled();
    expect(api.descargando).toBe(false);
  });

  it('sin conexión lo dice, y se puede volver a intentar', async () => { // spec 056 FR-047
    mockApiFetch.mockRejectedValueOnce(new ApiError(0, 'Sin conexión.'));
    await montar();
    await act(async () => api.descargar());
    expect(String(mockAlerta.mock.calls[0][1])).toMatch(/conexión|señal|internet/i);
    await act(async () => api.descargar());
    expect(abrir).toHaveBeenCalledWith(ENLACE);
  });

  it('si la respuesta no trae enlace, no abre nada y lo dice', async () => { // spec 056 FR-039
    mockApiFetch.mockResolvedValue({ reutilizado: true });
    await montar();
    await act(async () => api.descargar());
    expect(abrir).not.toHaveBeenCalled();
    expect(mockAlerta).toHaveBeenCalledTimes(1);
  });

  it('si el teléfono no logra abrir el enlace, lo dice en vez de quedarse mudo', async () => { // spec 056 FR-039
    abrir.mockRejectedValue(new Error('sin navegador'));
    await montar();
    await act(async () => api.descargar());
    expect(mockAlerta).toHaveBeenCalledTimes(1);
    expect(mockAlerta.mock.calls[0][0]).toBe('No se pudo abrir el documento');
  });

  it('el enlace solo se abre si es de la red (https): un esquema raro no sale del teléfono', async () => { // spec 056 FR-039
    mockApiFetch.mockResolvedValue({ ...respuesta, url: 'javascript:alert(1)' });
    await montar();
    await act(async () => api.descargar());
    expect(abrir).not.toHaveBeenCalled();
    expect(mockAlerta).toHaveBeenCalledTimes(1);
  });
});
