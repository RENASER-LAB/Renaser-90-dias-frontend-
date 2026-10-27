/**
 * `usePuertaDeObjetivos` (issue #37, 2026-10-27): lee lo mismo que la tarjeta del Mapa de Hoy —el borrador del
 * teléfono y, si ahí no está activo, el servidor— y dice si Plan → Objetivos se puede editar. Sin parpadeo, sin datos
 * de otra cuenta y sin dejar pasar ni bloquear a quien todavía no se sabe.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { MapaRenacimiento } from '../../../mapa-renacimiento/tipos';
import type { PuertaDeObjetivos } from '../../utils/puertaDeObjetivos';

const mockLeer = jest.fn<(userId: string) => Promise<MapaRenacimiento | null>>();
jest.mock('../../../mapa-renacimiento/almacen', () => ({ almacenMapa: { leer: (id: string) => mockLeer(id) } }));

const mockConsultar = jest.fn<() => Promise<{ stageCompleted: boolean }>>();
jest.mock('../../../mapa-renacimiento/api/mapaApi', () => ({ consultarMapa: () => mockConsultar() }));

let mockHabilitado = true;
jest.mock('../../../mapa-renacimiento/utils/mapaHabilitado', () => ({ mapaHabilitado: () => mockHabilitado }));

import { mapaVacio } from '../../../mapa-renacimiento/tipos';
import { usePuertaDeObjetivos } from '../usePuertaDeObjetivos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let ultima: { puerta: PuertaDeObjetivos; reintentar: () => void };
const historial: PuertaDeObjetivos[] = [];

function Sonda({ userId, refresco }: { userId: string | null; refresco?: unknown }) {
  ultima = usePuertaDeObjetivos(userId, refresco);
  historial.push(ultima.puerta);
  return null;
}

async function montar(userId: string | null, refresco?: unknown) {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda, { userId, refresco }));
  });
}

async function actualizar(userId: string | null, refresco?: unknown) {
  await act(async () => {
    raiz!.update(React.createElement(Sonda, { userId, refresco }));
  });
}

const conEstado = (estado: MapaRenacimiento['estado']): MapaRenacimiento => ({ ...mapaVacio(), estado });

beforeEach(() => {
  mockHabilitado = true;
  historial.length = 0;
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockLeer.mockReset();
  mockConsultar.mockReset();
});

describe('usePuertaDeObjetivos', () => {
  it('el Mapa activo en el teléfono abre los objetivos sin preguntarle al servidor', async () => {
    mockLeer.mockResolvedValue(conEstado('activo'));
    await montar('u1');
    expect(ultima.puerta).toBe('abierta');
    expect(mockConsultar).not.toHaveBeenCalled();
  });

  it('sin Mapa en el teléfono, el servidor puede confirmar que está hecho (otro teléfono)', async () => {
    mockLeer.mockResolvedValue(null);
    mockConsultar.mockResolvedValue({ stageCompleted: true });
    await montar('u1');
    expect(ultima.puerta).toBe('abierta');
  });

  it.each<[string, MapaRenacimiento | null]>([
    ['sin borrador', null],
    ['en progreso', conEstado('en_progreso')],
    ['listo para revisión', conEstado('listo_para_revision')],
  ])('con el servidor diciendo que no está hecho (%s), los objetivos esperan al Mapa', async (_caso, borrador) => {
    mockLeer.mockResolvedValue(borrador);
    mockConsultar.mockResolvedValue({ stageCompleted: false });
    await montar('u1');
    expect(ultima.puerta).toBe('espera-al-mapa');
  });

  it('la primera lectura es «comprobando»: ni un solo render con los objetivos abiertos o bloqueados antes de saber', async () => {
    mockLeer.mockResolvedValue(null);
    mockConsultar.mockResolvedValue({ stageCompleted: false });
    await montar('u1');
    expect(historial[0]).toBe('comprobando');
    expect(historial.filter(p => p === 'abierta')).toEqual([]);
  });

  it('sin red y sin «activo» en el teléfono: «sin-comprobar», y reintentar vuelve a preguntar', async () => {
    mockLeer.mockResolvedValue(null);
    mockConsultar.mockRejectedValueOnce(new Error('Sin conexión'));
    await montar('u1');
    expect(ultima.puerta).toBe('sin-comprobar');

    mockConsultar.mockResolvedValueOnce({ stageCompleted: true });
    await act(async () => {
      ultima.reintentar();
    });
    expect(mockConsultar).toHaveBeenCalledTimes(2);
    expect(ultima.puerta).toBe('abierta');
  });

  it('reintentar muestra «comprobando» y no el error anterior mientras espera', async () => {
    mockLeer.mockResolvedValue(null);
    mockConsultar.mockRejectedValueOnce(new Error('Sin conexión'));
    await montar('u1');
    expect(ultima.puerta).toBe('sin-comprobar');

    let resolver!: (v: { stageCompleted: boolean }) => void;
    mockConsultar.mockReturnValueOnce(new Promise(r => (resolver = r)));
    await act(async () => {
      ultima.reintentar();
    });
    expect(ultima.puerta).toBe('comprobando');
    await act(async () => {
      resolver({ stageCompleted: false });
    });
    expect(ultima.puerta).toBe('espera-al-mapa');
  });

  it('una relectura que falla no borra un «todavía no hay Mapa» ya confirmado, ni parpadea', async () => {
    mockLeer.mockResolvedValue(null);
    mockConsultar.mockResolvedValueOnce({ stageCompleted: false });
    await montar('u1', 'a');
    expect(ultima.puerta).toBe('espera-al-mapa');

    historial.length = 0;
    mockConsultar.mockRejectedValueOnce(new Error('Sin conexión'));
    await actualizar('u1', 'b');
    expect(ultima.puerta).toBe('espera-al-mapa');
    expect(historial.every(p => p === 'espera-al-mapa')).toBe(true);
  });

  it('al volver con el Mapa hecho (refresco), la puerta se abre', async () => {
    mockLeer.mockResolvedValueOnce(null).mockResolvedValueOnce(conEstado('activo'));
    mockConsultar.mockResolvedValue({ stageCompleted: false });
    await montar('u1', 'a');
    expect(ultima.puerta).toBe('espera-al-mapa');
    await actualizar('u1', 'b');
    expect(ultima.puerta).toBe('abierta');
  });

  it('al cambiar de cuenta no queda a la vista la lectura de la anterior ni por un render', async () => {
    mockLeer.mockResolvedValueOnce(conEstado('activo')).mockResolvedValueOnce(null);
    mockConsultar.mockResolvedValue({ stageCompleted: false });
    await montar('u1');
    expect(ultima.puerta).toBe('abierta');

    historial.length = 0;
    await actualizar('u2');
    expect(historial[0]).toBe('comprobando');
    expect(ultima.puerta).toBe('espera-al-mapa');
  });

  it('sin la sesión leída todavía, comprueba y no pregunta nada', async () => {
    await montar(null);
    expect(ultima.puerta).toBe('comprobando');
    expect(mockLeer).not.toHaveBeenCalled();
    expect(mockConsultar).not.toHaveBeenCalled();
  });

  it('en un build sin el Mapa, abierta y sin pedir nada', async () => {
    mockHabilitado = false;
    await montar('u1');
    expect(ultima.puerta).toBe('abierta');
    expect(mockLeer).not.toHaveBeenCalled();
    expect(mockConsultar).not.toHaveBeenCalled();
  });
});
