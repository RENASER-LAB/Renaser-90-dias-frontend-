import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El historial paginado que comparten Yo → Mi Radar y las fichas del mentor, del líder y de Administración (spec 012):
 * el cursor, no repetir un registro entre páginas, y decir por qué no se pudo (404 y 403 esconden la sección).
 */

import { ApiError } from '../../../../services/http/apiClient';
import type { HistorialRadarApi, RegistroRadarApi } from '../../types/radar.types';
import { useHistorialDeRadar, type CargarHistorialDeRadar } from '../useHistorialDeRadar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registro = (id: string, dia: number, hora = 10): RegistroRadarApi => ({
  id,
  whatAmIDoing: 'a',
  whatAmIThinking: 'b',
  whatAmIFeeling: 'c',
  energyLevel: 5,
  whatAmIAvoiding: 'd',
  createdAt: new Date(2026, 9, dia, hora).toISOString(),
});

async function vaciar() {
  await act(async () => {
    await new Promise<void>(r => setImmediate(r));
  });
}

function montar(cargar: CargarHistorialDeRadar | null) {
  const visto = { actual: undefined as unknown as ReturnType<typeof useHistorialDeRadar> };
  function Sonda({ c }: { c: CargarHistorialDeRadar | null }) {
    visto.actual = useHistorialDeRadar(c);
    return null;
  }
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda, { c: cargar }));
  });
  const cambiar = (c: CargarHistorialDeRadar | null) => act(() => raiz.update(React.createElement(Sonda, { c })));
  return { visto, cambiar, desmontar: () => act(() => raiz.unmount()) };
}

describe('useHistorialDeRadar', () => {
  it('lee la primera página con el estado de Mi Radar y agrupa por día', async () => {
    const cargar = jest.fn<CargarHistorialDeRadar>(async () => ({
      entries: [registro('a', 20), registro('b', 19)],
      nextCursor: 'c1',
      miRadar: { encendido: true, horas: [9, 14] },
    }));
    const { visto, desmontar } = montar(cargar);
    expect(visto.actual.cargando).toBe(true);
    await vaciar();
    expect(visto.actual.cargando).toBe(false);
    expect(visto.actual.registros.map(r => r.id)).toEqual(['a', 'b']);
    expect(visto.actual.dias.map(d => d.fecha)).toEqual(['2026-10-20', '2026-10-19']);
    expect(visto.actual.miRadar).toEqual({ encendido: true, horas: [9, 14] });
    expect(visto.actual.hayMas).toBe(true);
    desmontar();
  });

  it('«Ver más» pide el cursor y no repite un registro que ya estaba', async () => {
    const cargar = jest.fn<CargarHistorialDeRadar>(async (cursor?: string | null) =>
      cursor
        ? { entries: [registro('b', 19), registro('c', 18)], nextCursor: null }
        : { entries: [registro('a', 20), registro('b', 19)], nextCursor: 'c1' },
    );
    const { visto, desmontar } = montar(cargar);
    await vaciar();
    await act(async () => {
      await visto.actual.cargarMas();
    });
    expect(cargar).toHaveBeenLastCalledWith('c1');
    expect(visto.actual.registros.map(r => r.id)).toEqual(['a', 'b', 'c']);
    expect(visto.actual.hayMas).toBe(false);
    desmontar();
  });

  it('dos toques seguidos en «Ver más» piden la página una sola vez', async () => {
    let resolver!: (h: HistorialRadarApi) => void;
    const cargar = jest.fn<CargarHistorialDeRadar>(async (cursor?: string | null) =>
      cursor ? new Promise<HistorialRadarApi>(r => (resolver = r)) : { entries: [registro('a', 20)], nextCursor: 'c1' },
    );
    const { visto, desmontar } = montar(cargar);
    await vaciar();
    act(() => {
      void visto.actual.cargarMas();
      void visto.actual.cargarMas();
    });
    expect(cargar).toHaveBeenCalledTimes(2); // la primera página + UNA con cursor
    await act(async () => resolver({ entries: [], nextCursor: null }));
    desmontar();
  });

  it.each([
    [404, 'no_disponible'],
    [403, 'sin_permiso'],
    [0, 'sin_red'],
    [500, 'error'],
  ])('un %i se dice como «%s»', async (estado, fallo) => {
    const cargar = jest.fn<CargarHistorialDeRadar>(async () => {
      throw new ApiError(estado, 'x');
    });
    const { visto, desmontar } = montar(cargar);
    await vaciar();
    expect(visto.actual.fallo).toBe(fallo);
    expect(visto.actual.registros).toEqual([]);
    expect(visto.actual.cargando).toBe(false);
    desmontar();
  });

  it('sin a quién preguntarle (cargar null) no pide nada ni queda cargando', async () => {
    const { visto, desmontar } = montar(null);
    await vaciar();
    expect(visto.actual.cargando).toBe(false);
    expect(visto.actual.registros).toEqual([]);
    desmontar();
  });

  it('volver a leer en silencio no vacía la lista, ni siquiera si falla', async () => {
    let falla = false;
    const cargar = jest.fn<CargarHistorialDeRadar>(async () => {
      if (falla) throw new ApiError(0, 'sin red');
      return { entries: [registro('a', 20)], nextCursor: null };
    });
    const { visto, desmontar } = montar(cargar);
    await vaciar();
    falla = true;
    await act(async () => {
      await visto.actual.recargar();
    });
    expect(visto.actual.registros.map(r => r.id)).toEqual(['a']);
    expect(visto.actual.fallo).toBeNull();
    desmontar();
  });

  it('al cambiar de persona (otro `cargar`) se vuelve a leer desde la primera página y no queda lo de la anterior', async () => {
    const deUna = jest.fn<CargarHistorialDeRadar>(async () => ({ entries: [registro('una', 20)], nextCursor: null }));
    const deOtra = jest.fn<CargarHistorialDeRadar>(async () => ({ entries: [registro('otra', 20)], nextCursor: null }));
    const { visto, cambiar, desmontar } = montar(deUna);
    await vaciar();
    cambiar(deOtra);
    await vaciar();
    expect(visto.actual.registros.map(r => r.id)).toEqual(['otra']);
    desmontar();
  });
});
