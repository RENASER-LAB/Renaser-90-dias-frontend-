/**
 * `useEventosDeLaSemana` (spec 014, condición del dueño: ningún endpoint «se ejecuta 1000 veces»). Volver a la pestaña
 * no repite el pedido mientras la lectura es reciente; cambiar de semana o de cuenta sí pide.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { Ocurrencia } from '../../../eventos/types/eventos.types';
import { olvidarEventosDeLaSemana, useEventosDeLaSemana, VIGENCIA_DE_LOS_EVENTOS_MS } from '../useEventosDeLaSemana';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const leer = jest.fn(async (_desde: Date, _hasta: Date): Promise<Ocurrencia[]> => []);
let raiz: ReactTestRenderer | null = null;

function Sonda({ cuenta = 'c1', lunes = '2026-10-26', activa = true }: { cuenta?: string; lunes?: string; activa?: boolean }) {
  useEventosDeLaSemana({ cuentaId: cuenta, activa, habilitado: true, lunes, leer });
  return null;
}
const montar = (props: Parameters<typeof Sonda>[0] = {}) => act(async () => { raiz = TestRenderer.create(React.createElement(Sonda, props)); });
const actualizar = (props: Parameters<typeof Sonda>[0]) => act(async () => { raiz!.update(React.createElement(Sonda, props)); });

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  leer.mockClear();
  olvidarEventosDeLaSemana();
  jest.restoreAllMocks();
});

describe('useEventosDeLaSemana', () => {
  it('perder y recuperar el foco varias veces hace un solo pedido', async () => {
    await montar({ activa: true });
    for (let i = 0; i < 5; i++) {
      await actualizar({ activa: false });
      await actualizar({ activa: true });
    }
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('volver a montar Training dentro de la vigencia no pide otra vez', async () => {
    await montar();
    act(() => raiz?.unmount());
    raiz = null;
    await montar();
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('pasada la vigencia, al volver a la pestaña sí vuelve a leer', async () => {
    const ahora = Date.now();
    const reloj = jest.spyOn(Date, 'now').mockReturnValue(ahora);
    await montar();
    await actualizar({ activa: false });
    reloj.mockReturnValue(ahora + VIGENCIA_DE_LOS_EVENTOS_MS + 1);
    await actualizar({ activa: true });
    expect(leer).toHaveBeenCalledTimes(2);
  });

  it('otra semana u otra cuenta piden lo suyo', async () => {
    await montar({ lunes: '2026-10-26' });
    await actualizar({ lunes: '2026-11-02' });
    await actualizar({ lunes: '2026-11-02', cuenta: 'c2' });
    expect(leer).toHaveBeenCalledTimes(3);
  });
});
