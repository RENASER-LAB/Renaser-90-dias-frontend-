import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Código Renaser en las fichas» (spec 034, D-299): el mentor, la guía y el líder ven la sección «Código Renaser» de la ficha
 * de un aprendiz solo si Administración lo encendió. Apagado (de fábrica), la sección **no se dibuja ni se pide**: sin hueco, sin
 * error y sin aviso de mantenimiento. Es el mismo componente de las tres fichas (mentor, líder y Administración), así que la
 * regla vale para las tres; Administración y Alquimista tienen la funcionalidad siempre prendida y no cambian.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../components/Aparicion', () => ({
  Aparicion: ({ children }: { children: React.ReactNode }) => children,
}));

let mockFuncionalidad = { prendida: true, aviso: null as string | null, disponible: true };
const mockClaves: string[] = [];
jest.mock('../../../plataforma/estado/useFuncionalidad', () => ({
  useFuncionalidad: (clave: string) => {
    mockClaves.push(clave);
    return mockFuncionalidad;
  },
}));

import type { HistorialRadarApi } from '../../../radar/types/radar.types';
import { CodigoRenaserDelAlumno } from '../CodigoRenaserDelAlumno';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HISTORIAL: HistorialRadarApi = {
  entries: [
    {
      id: 'r-1',
      whatAmIDoing: 'trabajando',
      whatAmIThinking: 'pensando',
      whatAmIFeeling: 'sintiendo',
      energyLevel: 7,
      whatAmIAvoiding: 'evitando',
      createdAt: new Date(2026, 9, 29, 14, 6).toISOString(),
    },
  ],
  nextCursor: null,
};

const cargar = jest.fn<(cursor?: string | null) => Promise<HistorialRadarApi>>();

async function dibujar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(CodigoRenaserDelAlumno, { cargar }));
    await new Promise<void>(res => setImmediate(res));
  });
  return r;
}
/** Cuántos elementos de pantalla (View, Text…) se dibujaron: 0 = la sección no existe. */
const nodosDibujados = (r: ReactTestRenderer) => r.root.findAll(n => typeof n.type === 'string').length;
const textos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');

beforeEach(() => {
  mockFuncionalidad = { prendida: true, aviso: null, disponible: true };
  mockClaves.length = 0;
  cargar.mockReset().mockResolvedValue(HISTORIAL);
});

describe('la sección «Código Renaser» de una ficha según el interruptor de Administración', () => {
  it('pregunta por la funcionalidad `radar.fichas`', async () => {
    await dibujar();
    expect(mockClaves).toContain('radar.fichas');
  });

  it('encendido: se pide y se dibuja como siempre', async () => {
    const r = await dibujar();
    expect(cargar).toHaveBeenCalledTimes(1);
    expect(textos(r)).toContain('CÓDIGO RENASER');
    expect(textos(r)).toContain('trabajando');
  });

  it('apagado (o escondida para el rol): no se dibuja nada y ni siquiera se pide', async () => {
    mockFuncionalidad = { prendida: false, aviso: null, disponible: false };
    const r = await dibujar();
    expect(cargar).not.toHaveBeenCalled();
    expect(nodosDibujados(r)).toBe(0);
  });

  it('con solo `disponible` en falso (se esconde, no es mantenimiento) tampoco se pide ni se dibuja', async () => {
    mockFuncionalidad = { prendida: true, aviso: null, disponible: false };
    const r = await dibujar();
    expect(cargar).not.toHaveBeenCalled();
    expect(nodosDibujados(r)).toBe(0);
  });

  it('con solo `prendida` en falso tampoco: no sale el aviso de mantenimiento ni un hueco', async () => {
    mockFuncionalidad = { prendida: false, aviso: 'Volvemos pronto', disponible: true };
    const r = await dibujar();
    expect(cargar).not.toHaveBeenCalled();
    expect(nodosDibujados(r)).toBe(0);
    expect(textos(r)).not.toContain('Volvemos pronto');
  });

  it('si un 404 del servidor llega igual (la copia de la app se quedó atrás), la sección tampoco aparece', async () => {
    const { ApiError } = jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient');
    cargar.mockRejectedValue(new ApiError(404, 'no disponible'));
    const r = await dibujar();
    expect(nodosDibujados(r)).toBe(0);
  });
});
