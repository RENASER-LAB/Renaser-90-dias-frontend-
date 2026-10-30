/**
 * `useDiasCerrados` (spec 014, condición del dueño sobre `GET /habit-tracks/day`): el hook no pide nada por sí mismo.
 * Abrir Training, perder y recuperar el foco o volver a dibujar NO piden un día anterior; solo lo hace `pedir`, que es
 * el toque de la persona, y una sola vez por fecha.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { TrackDelDiaApi } from '../../../habits/types/habits.types';
import { useDiasCerrados } from '../useDiasCerrados';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const leer = jest.fn(async (fecha: string): Promise<TrackDelDiaApi[] | null> => [{ id: fecha, fechaEjecucion: fecha } as TrackDelDiaApi]);
let raiz: ReactTestRenderer | null = null;
let hook!: ReturnType<typeof useDiasCerrados>;

function Sonda({ cuenta = 'c1', semana = '2026-10-26', activa = true }: { cuenta?: string; semana?: string; activa?: boolean }) {
  hook = useDiasCerrados({ cuentaId: cuenta, semana, leer });
  return React.createElement('Text', null, String(activa));
}
const montar = (props: Parameters<typeof Sonda>[0] = {}) => act(async () => { raiz = TestRenderer.create(React.createElement(Sonda, props)); });
const actualizar = (props: Parameters<typeof Sonda>[0]) => act(async () => { raiz!.update(React.createElement(Sonda, props)); });

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  leer.mockClear();
});

describe('useDiasCerrados', () => {
  it('abrir Training no pide ningún día', async () => {
    await montar();
    expect(leer).not.toHaveBeenCalled();
    expect(hook.estadoDe('2026-10-28')).toBeUndefined();
  });

  it('enfocar Training (perder y recuperar el foco) y dibujar muchas veces tampoco', async () => {
    await montar();
    for (let i = 0; i < 20; i++) await actualizar({ activa: i % 2 === 0 });
    expect(leer).not.toHaveBeenCalled();
  });

  it('el toque pide el día UNA vez, aunque se toque muchas veces o a la vez', async () => {
    await montar();
    await act(async () => {
      await Promise.all([hook.pedir('2026-10-28'), hook.pedir('2026-10-28'), hook.pedir('2026-10-28')]);
    });
    for (let i = 0; i < 10; i++) await act(async () => { await hook.pedir('2026-10-28'); });
    expect(leer).toHaveBeenCalledTimes(1);
    expect(hook.estadoDe('2026-10-28')?.estado).toBe('datos');
  });

  it('dibujar de nuevo después de leído sigue sin pedir', async () => {
    await montar();
    await act(async () => { await hook.pedir('2026-10-28'); });
    for (let i = 0; i < 5; i++) await actualizar({});
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('cambiar de cuenta o de semana limpia la memoria', async () => {
    await montar();
    await act(async () => { await hook.pedir('2026-10-28'); });
    await actualizar({ cuenta: 'c2' });
    expect(hook.estadoDe('2026-10-28')).toBeUndefined();
    await act(async () => { await hook.pedir('2026-10-28'); });
    expect(leer).toHaveBeenCalledTimes(2);
    await actualizar({ cuenta: 'c2', semana: '2026-11-02' });
    expect(hook.estadoDe('2026-10-28')).toBeUndefined();
  });
});
