import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockObtenerParticipantes = jest.fn<(id: string, params?: { q?: string; page?: number; size?: number }) => Promise<unknown>>();
jest.mock('../../api/chatApi', () => ({ obtenerParticipantes: (...args: unknown[]) => (mockObtenerParticipantes as any)(...args) }));

import type { WireParticipante } from '../../types/chat.types';
import { juntarPaginas, TAMANO_DE_PAGINA, useParticipantesDelChat } from '../useParticipantesDelChat';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const persona = (userId: string, nombre = userId): WireParticipante => ({ userId, nombre, rol: 'APRENDIZ', esUnoMismo: false });
const pagina = (participants: WireParticipante[], total: number, page = 0) => ({ participants, total, page, size: TAMANO_DE_PAGINA });

type Estado = ReturnType<typeof useParticipantesDelChat>;

function montar(conversationId: string | null, busqueda = '') {
  const visto: { actual: Estado } = { actual: undefined as unknown as Estado };
  function Sonda(props: { id: string | null; q: string }) {
    visto.actual = useParticipantesDelChat(props.id, props.q);
    return null;
  }
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda, { id: conversationId, q: busqueda }));
  });
  const cambiar = (id: string | null, q = '') => act(() => raiz.update(React.createElement(Sonda, { id, q })));
  return { visto, cambiar };
}

async function vaciar() {
  await act(async () => {
    await new Promise<void>(r => setImmediate(r));
  });
}

describe('juntarPaginas', () => {
  it('suma la página siguiente sin repetir a quien ya estaba (alguien entró mientras se paginaba)', () => {
    const suma = juntarPaginas([persona('a'), persona('b')], [persona('b'), persona('c')]);

    expect(suma.map(p => p.userId)).toEqual(['a', 'b', 'c']);
  });
});

describe('useParticipantesDelChat', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    mockObtenerParticipantes.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('sin conversación no pide nada', async () => {
    const { visto } = montar(null);
    await vaciar();

    expect(mockObtenerParticipantes).not.toHaveBeenCalled();
    expect(visto.actual.filas).toEqual([]);
    expect(visto.actual.total).toBeNull();
  });

  it('trae la primera página de ESA conversación y sabe cuántas faltan', async () => {
    mockObtenerParticipantes.mockResolvedValueOnce(pagina([persona('a'), persona('b')], 3));
    const { visto } = montar('c-global');
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await vaciar();

    expect(mockObtenerParticipantes).toHaveBeenCalledWith('c-global', { q: '', size: TAMANO_DE_PAGINA });
    expect(visto.actual.filas.map(p => p.userId)).toEqual(['a', 'b']);
    expect(visto.actual.total).toBe(3);
    expect(visto.actual.totalSinBuscar).toBe(3);
    expect(visto.actual.hayMas).toBe(true);
  });

  it('«Ver más» pide la página siguiente y la suma', async () => {
    mockObtenerParticipantes.mockResolvedValueOnce(pagina([persona('a'), persona('b')], 3));
    const { visto } = montar('c-global');
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await vaciar();
    mockObtenerParticipantes.mockResolvedValueOnce(pagina([persona('c')], 3, 1));
    act(() => visto.actual.verMas());
    await vaciar();

    expect(mockObtenerParticipantes).toHaveBeenLastCalledWith('c-global', { q: '', page: 1, size: TAMANO_DE_PAGINA });
    expect(visto.actual.filas.map(p => p.userId)).toEqual(['a', 'b', 'c']);
    expect(visto.actual.hayMas).toBe(false);
  });

  it('la búsqueda espera a que se deje de escribir y no pisa el total del chat entero', async () => {
    mockObtenerParticipantes.mockResolvedValueOnce(pagina([persona('a'), persona('b')], 2));
    const { visto, cambiar } = montar('c-global');
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await vaciar();

    mockObtenerParticipantes.mockResolvedValueOnce(pagina([persona('b')], 1));
    cambiar('c-global', 'be');
    expect(mockObtenerParticipantes).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    await vaciar();

    expect(mockObtenerParticipantes).toHaveBeenLastCalledWith('c-global', { q: 'be', size: TAMANO_DE_PAGINA });
    expect(visto.actual.filas.map(p => p.userId)).toEqual(['b']);
    expect(visto.actual.total).toBe(1);
    expect(visto.actual.totalSinBuscar).toBe(2);
  });

  it('la respuesta lenta de un chat no pisa a la de otro', async () => {
    let entregarLaVieja!: (v: unknown) => void;
    mockObtenerParticipantes.mockImplementationOnce(() => new Promise(r => (entregarLaVieja = r)));
    const { visto, cambiar } = montar('c-viejo');
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    mockObtenerParticipantes.mockResolvedValueOnce(pagina([persona('nuevo')], 1));
    cambiar('c-nuevo');
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await vaciar();
    await act(async () => {
      entregarLaVieja(pagina([persona('viejo')], 1));
    });
    await vaciar();

    expect(visto.actual.filas.map(p => p.userId)).toEqual(['nuevo']);
  });

  it('un error se dice, y no deja filas de nadie', async () => {
    mockObtenerParticipantes.mockRejectedValueOnce(new Error('sin red'));
    const { visto } = montar('c-global');
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await vaciar();

    expect(visto.actual.error).toBeTruthy();
    expect(visto.actual.filas).toEqual([]);
    expect(visto.actual.cargando).toBe(false);
  });
});
