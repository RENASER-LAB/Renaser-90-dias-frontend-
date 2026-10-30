import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import type { CierreDelDia } from '../../types/cierre.types';
import { crearLecturaDeCierres } from '../lecturaDeCierres';

/** La memoria de «Cerrado» / «Sin cerrar» de los días anteriores (spec 017): una lectura por fecha y por cuenta. */

const cierre = (fecha: string, estado: CierreDelDia['estado'] = 'CERRADO'): CierreDelDia => ({
  fecha,
  estado,
  cerradoEn: null,
  nota: null,
  acciones: [],
  puedeCerrar: false,
  semana: null,
});

function crear(leer: (fecha: string) => Promise<CierreDelDia>) {
  const lectura = crearLecturaDeCierres(leer);
  lectura.alinear('c1', '2026-10-26');
  return lectura;
}

describe('la memoria de los cierres de días anteriores', () => {
  it('no pide nada hasta que se toca un día', () => {
    const leer = jest.fn(async (f: string) => cierre(f));
    const lectura = crear(leer);
    expect(leer).not.toHaveBeenCalled();
    expect(lectura.estadoDe('2026-10-28')).toBeUndefined();
  });

  it('pide una vez por fecha: tocar el mismo día otra vez usa lo guardado', async () => {
    const leer = jest.fn(async (f: string) => cierre(f));
    const lectura = crear(leer);
    await lectura.pedir('2026-10-28');
    await lectura.pedir('2026-10-28');
    await lectura.pedir('2026-10-28');
    expect(leer).toHaveBeenCalledTimes(1);
    expect(lectura.estadoDe('2026-10-28')).toMatchObject({ estado: 'datos' });
    await lectura.pedir('2026-10-27');
    expect(leer.mock.calls.map(([f]) => f)).toEqual(['2026-10-28', '2026-10-27']);
  });

  it('dos toques seguidos comparten el pedido en vuelo', async () => {
    const leer = jest.fn(async (f: string) => cierre(f));
    const lectura = crear(leer);
    await Promise.all([lectura.pedir('2026-10-28'), lectura.pedir('2026-10-28')]);
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('un error de red no se reintenta solo; sí a pedido', async () => {
    const leer = jest.fn<(f: string) => Promise<CierreDelDia>>()
      .mockRejectedValueOnce(new ApiError(0, 'Sin red'))
      .mockResolvedValueOnce(cierre('2026-10-28'));
    const lectura = crear(leer);
    await lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'error' });
    await lectura.pedir('2026-10-28');
    expect(leer).toHaveBeenCalledTimes(1);
    await lectura.pedir('2026-10-28', { reintentar: true });
    expect(lectura.estadoDe('2026-10-28')).toMatchObject({ estado: 'datos' });
  });

  it.each([400, 403, 404])('un %s es «sin datos»: acá no hay cierre, y no se reintenta', async status => {
    const leer = jest.fn(async () => {
      throw new ApiError(status, 'no');
    });
    const lectura = crear(leer);
    await lectura.pedir('2026-10-28');
    await lectura.pedir('2026-10-28', { reintentar: true });
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'sin-datos' });
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('un 503 (plan apagado por Soporte TI) es un error pasajero, no «sin datos» para siempre', async () => {
    const lectura = crear(async () => {
      throw new ApiError(503, 'En mantenimiento');
    });
    await lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'error' });
  });

  it('una respuesta que no es un cierre (un backend que no lo conoce) es «sin datos»', async () => {
    const lectura = crear(async () => {
      throw new Error('Respuesta inesperada');
    });
    await lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'sin-datos' });
  });

  it('el cierre de OTRA fecha no se muestra en este día', async () => {
    const lectura = crear(async () => cierre('2026-10-20'));
    await lectura.pedir('2026-10-28');
    expect(lectura.estadoDe('2026-10-28')).toEqual({ estado: 'sin-datos' });
  });

  it('cambiar de cuenta o de semana limpia la memoria, y una respuesta tardía de la anterior se descarta', async () => {
    let soltar!: (c: CierreDelDia) => void;
    const leer = jest.fn((f: string) => new Promise<CierreDelDia>(res => { soltar = res; void f; }));
    const lectura = crear(leer);
    const enVuelo = lectura.pedir('2026-10-28');
    lectura.alinear('c2', '2026-10-26');
    soltar(cierre('2026-10-28'));
    await enVuelo;
    expect(lectura.estadoDe('2026-10-28')).toBeUndefined();

    const l2 = crearLecturaDeCierres(async f => cierre(f));
    l2.alinear('c1', '2026-10-26');
    await l2.pedir('2026-10-28');
    l2.alinear('c1', '2026-11-02');
    expect(l2.estadoDe('2026-10-28')).toBeUndefined();
  });

  it('avisa a quien escucha cuando cambia algo', async () => {
    const lectura = crear(async f => cierre(f));
    const oyente = jest.fn();
    const dejar = lectura.suscribir(oyente);
    await lectura.pedir('2026-10-28');
    expect(oyente).toHaveBeenCalled();
    dejar();
    oyente.mockClear();
    await lectura.pedir('2026-10-27');
    expect(oyente).not.toHaveBeenCalled();
  });
});
