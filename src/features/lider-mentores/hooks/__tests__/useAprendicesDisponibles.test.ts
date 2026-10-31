import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import type { PaginaDeAprendices } from '../../types/aprendicesDelLider.types';

/**
 * ¿Ofrece el servidor «Todos los aprendices»? (2026-10-31). La fila de Hoy → «Mis mentores» existe solo si la primera
 * página de la lista responde 200: con 404 o 403 (un backend anterior, u otro rol) o con cualquier otro fallo no se dibuja,
 * y mientras se pregunta tampoco. Quien no lidera mentores no paga ningún pedido.
 */

const mockLista = jest.fn<(opciones?: { q?: string; pagina?: number; tamano?: number }) => Promise<PaginaDeAprendices>>();
jest.mock('../../api/aprendicesDelLiderApi', () => ({
  TAMANO_DE_LA_PAGINA: 30,
  obtenerAprendicesDelLider: (o?: { q?: string; pagina?: number; tamano?: number }) => mockLista(o),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { useAprendicesDisponibles } from '../useAprendicesDisponibles';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAGINA: PaginaDeAprendices = { items: [], pagina: 0, tamano: 1, total: 0, hayMas: false };

function Sonda({ activo, alLeer }: { activo: boolean; alLeer: (v: boolean | null) => void }) {
  alLeer(useAprendicesDisponibles(activo));
  return null;
}

async function leer(activo: boolean): Promise<Array<boolean | null>> {
  const lecturas: Array<boolean | null> = [];
  await act(async () => {
    TestRenderer.create(React.createElement(Sonda, { activo, alLeer: v => lecturas.push(v) }));
  });
  return lecturas;
}

beforeEach(() => {
  mockLista.mockReset();
});

describe('useAprendicesDisponibles', () => {
  it('con 200 la fila se ofrece; antes de saberlo, no (sin parpadeo)', async () => {
    mockLista.mockResolvedValue(PAGINA);
    const lecturas = await leer(true);
    expect(lecturas[0]).toBeNull();
    expect(lecturas.at(-1)).toBe(true);
    expect(lecturas).not.toContain(false);
  });

  it('pide una página mínima, no la lista entera', async () => {
    mockLista.mockResolvedValue(PAGINA);
    await leer(true);
    expect(mockLista).toHaveBeenCalledTimes(1);
    expect(mockLista).toHaveBeenCalledWith({ pagina: 0, tamano: 1 });
  });

  it.each([404, 403, 500, 0])('con %s (backend anterior, otro rol o caído) no se ofrece', async status => {
    mockLista.mockRejectedValue(new ApiError(status, 'no'));
    expect((await leer(true)).at(-1)).toBe(false);
  });

  it('una respuesta que no es una lista tampoco la ofrece', async () => {
    mockLista.mockRejectedValue(new Error('Respuesta inesperada de GET /leadership/people'));
    expect((await leer(true)).at(-1)).toBe(false);
  });

  it('para otros roles no se pregunta nada', async () => {
    const lecturas = await leer(false);
    expect(mockLista).not.toHaveBeenCalled();
    expect(lecturas.every(v => v === null)).toBe(true);
  });
});
