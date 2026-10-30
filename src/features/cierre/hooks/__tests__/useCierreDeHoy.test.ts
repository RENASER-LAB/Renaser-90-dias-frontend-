/**
 * Lo que Training sabe del cierre de HOY (spec 017): se lee solo cuando ya es la hora y Training está a la vista, se
 * vuelve a leer al volver a activarse, y la fila de ayer no queda en hoy cuando pasa la medianoche.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import type { CierreDelDia } from '../../types/cierre.types';
import { useCierreDeHoy } from '../useCierreDeHoy';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cierre = (fecha: string, extra: Partial<CierreDelDia> = {}): CierreDelDia => ({
  fecha,
  estado: 'ABIERTO',
  cerradoEn: null,
  nota: null,
  acciones: [],
  puedeCerrar: true,
  semana: null,
  ...extra,
});

let leer: jest.Mock<(fecha?: string | null) => Promise<CierreDelDia>>;
let raiz: ReactTestRenderer | null = null;
let hook!: ReturnType<typeof useCierreDeHoy>;

type Props = { cuentaId?: string; hoyIso?: string; activo?: boolean };
function Sonda({ cuentaId = 'c1', hoyIso = '2026-10-29', activo = true }: Props) {
  hook = useCierreDeHoy({ cuentaId, hoyIso, activo, leer });
  return React.createElement('Text', null, hook.lectura.estado);
}
const montar = (props: Props = {}) => act(async () => { raiz = TestRenderer.create(React.createElement(Sonda, props)); });
const actualizar = (props: Props) => act(async () => { raiz!.update(React.createElement(Sonda, props)); });

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('cuándo lee', () => {
  it('inactivo (no es la hora, o Training no está a la vista) no pide nada y no hay fila', async () => {
    leer = jest.fn(async (f?: string | null) => cierre(f ?? '2026-10-29'));
    await montar({ activo: false });
    expect(leer).not.toHaveBeenCalled();
    expect(hook.lectura).toEqual({ estado: 'sin-leer' });
  });

  it('al activarse lee HOY, y con la respuesta queda listo', async () => {
    leer = jest.fn(async (f?: string | null) => cierre(f ?? '2026-10-29'));
    await montar({ activo: false });
    await actualizar({ activo: true });
    expect(leer).toHaveBeenCalledTimes(1);
    expect(leer).toHaveBeenCalledWith('2026-10-29');
    expect(hook.lectura).toMatchObject({ estado: 'listo', vista: { fecha: '2026-10-29' } });
  });

  it('seguir activo y volver a dibujar no vuelve a pedir; volver a activarse (volver al foco) sí', async () => {
    leer = jest.fn(async (f?: string | null) => cierre(f ?? '2026-10-29'));
    await montar();
    await actualizar({ activo: true });
    await actualizar({ activo: true });
    expect(leer).toHaveBeenCalledTimes(1);
    await actualizar({ activo: false });
    await actualizar({ activo: true });
    expect(leer).toHaveBeenCalledTimes(2);
  });
});

describe('cuándo no hay fila', () => {
  it.each([400, 403, 404])('un %s es «acá no hay cierre» (backend anterior, otro rol, plan apagado)', async status => {
    leer = jest.fn(async () => {
      throw new ApiError(status, 'no');
    });
    await montar();
    expect(hook.lectura).toEqual({ estado: 'no-disponible' });
  });

  it('una respuesta que no es un cierre (un backend que contesta otra cosa) tampoco', async () => {
    leer = jest.fn(async () => {
      throw new Error('Respuesta inesperada de GET /rocks/day-closure');
    });
    await montar();
    expect(hook.lectura).toEqual({ estado: 'no-disponible' });
  });

  it('un cierre de otra fecha no se muestra en hoy', async () => {
    leer = jest.fn(async () => cierre('2026-10-28'));
    await montar();
    expect(hook.lectura).toEqual({ estado: 'no-disponible' });
  });

  it('un fallo de red es `error` (sin fila, se vuelve a intentar al activarse); no borra lo que ya se había leído', async () => {
    leer = jest.fn<(f?: string | null) => Promise<CierreDelDia>>()
      .mockResolvedValueOnce(cierre('2026-10-29'))
      .mockRejectedValueOnce(new ApiError(0, 'Sin red'));
    await montar();
    expect(hook.lectura.estado).toBe('listo');
    await actualizar({ activo: false });
    await actualizar({ activo: true });
    expect(hook.lectura.estado).toBe('listo');
  });

  it('un fallo de red en la primera lectura deja `error`', async () => {
    leer = jest.fn(async () => {
      throw new ApiError(500, 'Error');
    });
    await montar();
    expect(hook.lectura).toEqual({ estado: 'error' });
  });
});

describe('la medianoche y la cuenta', () => {
  it('al pasar la medianoche la lectura de ayer se descarta y se lee el día nuevo', async () => {
    leer = jest.fn(async (f?: string | null) => cierre(f ?? '', { estado: 'CERRADO' }));
    await montar({ hoyIso: '2026-10-29' });
    expect(hook.lectura).toMatchObject({ estado: 'listo', vista: { fecha: '2026-10-29' } });

    let soltar!: (c: CierreDelDia) => void;
    leer.mockImplementationOnce(() => new Promise<CierreDelDia>(res => { soltar = res; }));
    await actualizar({ hoyIso: '2026-10-30' });
    // Mientras llega la del día nuevo, la de ayer NO está: ni un cuadro con la fila de ayer en hoy.
    expect(hook.lectura).toEqual({ estado: 'sin-leer' });
    await act(async () => soltar(cierre('2026-10-30')));
    expect(hook.lectura).toMatchObject({ estado: 'listo', vista: { fecha: '2026-10-30', estado: 'ABIERTO' } });
    expect(leer).toHaveBeenLastCalledWith('2026-10-30');
  });

  it('una respuesta tardía de ayer no pisa la de hoy', async () => {
    let soltarAyer!: (c: CierreDelDia) => void;
    leer = jest.fn()
      .mockImplementationOnce(() => new Promise<CierreDelDia>(res => { soltarAyer = res; }))
      .mockImplementationOnce(async () => cierre('2026-10-30')) as typeof leer;
    await montar({ hoyIso: '2026-10-29' });
    await actualizar({ hoyIso: '2026-10-30' });
    await act(async () => soltarAyer(cierre('2026-10-29')));
    expect(hook.lectura).toMatchObject({ estado: 'listo', vista: { fecha: '2026-10-30' } });
  });

  it('cambiar de cuenta empieza de cero', async () => {
    leer = jest.fn(async (f?: string | null) => cierre(f ?? '2026-10-29'));
    await montar({ cuentaId: 'c1' });
    await actualizar({ cuentaId: 'c2' });
    expect(leer).toHaveBeenCalledTimes(2);
  });
});

describe('lo que trae o guarda la hoja', () => {
  it('`reemplazar` deja la fila al día sin otro pedido; el cierre de otro día se ignora', async () => {
    leer = jest.fn(async (f?: string | null) => cierre(f ?? '2026-10-29'));
    await montar();
    await act(async () => hook.reemplazar(cierre('2026-10-29', { estado: 'CERRADO' })));
    expect(hook.lectura).toMatchObject({ estado: 'listo', vista: { estado: 'CERRADO' } });
    await act(async () => hook.reemplazar(cierre('2026-10-28', { estado: 'SIN_CERRAR' })));
    expect(hook.lectura).toMatchObject({ vista: { fecha: '2026-10-29', estado: 'CERRADO' } });
    expect(leer).toHaveBeenCalledTimes(1);
  });
});
