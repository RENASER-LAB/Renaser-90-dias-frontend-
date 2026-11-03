/** La ficha de ingreso de una persona en su ficha de Administración, MONTADA (spec 026-9). */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
const mockLogro = jest.fn();
const mockError = jest.fn();
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => mockError(), logro: () => mockLogro() } }));
const mockConfirmar = jest.fn<(...a: unknown[]) => Promise<boolean>>();
const mockAvisar = jest.fn();
jest.mock('../../admin/utils/dialogo', () => ({
  confirmar: (...a: unknown[]) => mockConfirmar(...a),
  avisar: (...a: unknown[]) => mockAvisar(...a),
}));
const mockLeer = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockAsignar = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('../api/diagnosticoAdminApi', () => ({
  ...(jest.requireActual('../api/diagnosticoAdminApi') as object),
  leerFichaDeLaPersona: (...a: unknown[]) => mockLeer(...a),
  asignarFicha: (...a: unknown[]) => mockAsignar(...a),
}));

import { ApiError } from '../../../services/http/apiClient';
import { FichaDeIngresoDeLaPersona } from '../components/FichaDeIngresoDeLaPersona';
import { crearAyudas } from './montaje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const lectura = (ficha: 'ESTANDAR' | 'CON_DIAGNOSTICO', estado: string) => ({ ficha, estado, secciones: [] });
const alCambiar = jest.fn();
let raiz: ReactTestRenderer | null = null;
const { hay, textos, tocar } = crearAyudas(() => raiz!);
const montar = async () => {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(FichaDeIngresoDeLaPersona, { personaId: 'u1', nombre: 'Ana Pérez', alCambiar }));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirmar.mockResolvedValue(true);
  mockLeer.mockResolvedValue(lectura('ESTANDAR', 'NO_APLICA'));
  mockAsignar.mockResolvedValue({ asignadas: 1, omitidas: [] });
});
afterEach(async () => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  raiz = null;
});

describe('la ficha de ingreso de la persona', () => {
  it('con la ficha estándar la dice y ofrece asignar el diagnóstico', async () => {
    await montar();
    expect(mockLeer).toHaveBeenCalledWith('u1');
    expect(hay('Ficha de ingreso')).toBe(true);
    expect(textos()).toContain('Estándar');
    expect(hay('Asignar el diagnóstico')).toBe(true);
    expect(hay('Volver a la ficha estándar')).toBe(false);
  });

  it('asignar pide confirmar, manda su id y lo avisa; después relee', async () => {
    await montar();
    mockLeer.mockResolvedValue(lectura('CON_DIAGNOSTICO', 'PENDIENTE'));
    await tocar('Asignar el diagnóstico');
    expect(mockConfirmar).toHaveBeenCalledWith('¿Asignar el diagnóstico a Ana Pérez?', expect.stringContaining('Completa tu diagnóstico'), expect.anything());
    expect(mockAsignar).toHaveBeenCalledWith(['u1'], 'CON_DIAGNOSTICO');
    expect(mockLogro).toHaveBeenCalled();
    expect(alCambiar).toHaveBeenCalledWith('Listo: Ana Pérez tiene el diagnóstico.');
    expect(textos()).toContain('Con diagnóstico · todavía no empieza');
    expect(hay('Volver a la ficha estándar')).toBe(true);
  });

  it('si no se confirma, no se cambia nada', async () => {
    mockConfirmar.mockResolvedValue(false);
    await montar();
    await tocar('Asignar el diagnóstico');
    expect(mockAsignar).not.toHaveBeenCalled();
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('con diagnóstico ofrece volver a la estándar', async () => {
    mockLeer.mockResolvedValue(lectura('CON_DIAGNOSTICO', 'EN_CURSO'));
    await montar();
    expect(textos()).toContain('Con diagnóstico · lo está respondiendo');
    mockLeer.mockResolvedValue(lectura('ESTANDAR', 'NO_APLICA'));
    await tocar('Volver a la ficha estándar');
    expect(mockConfirmar).toHaveBeenCalledWith('¿Volver a la ficha estándar?', expect.stringContaining('volverá a la ficha de siempre'), expect.anything());
    expect(mockAsignar).toHaveBeenCalledWith(['u1'], 'ESTANDAR');
    expect(alCambiar).toHaveBeenCalledWith('Listo: Ana Pérez volvió a la ficha estándar.');
  });

  it('el 409 del servidor (ya respondió) se muestra con su motivo', async () => {
    mockLeer.mockResolvedValue(lectura('CON_DIAGNOSTICO', 'COMPLETADO'));
    mockAsignar.mockRejectedValue(new ApiError(409, 'Ana ya respondió el diagnóstico: no se puede volver a la ficha estándar.'));
    await montar();
    await tocar('Volver a la ficha estándar');
    expect(mockAvisar).toHaveBeenCalledWith('No se pudo volver a la ficha estándar', 'Ana ya respondió el diagnóstico: no se puede volver a la ficha estándar.');
    expect(hay('Ana ya respondió el diagnóstico')).toBe(true);
    expect(alCambiar).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalled();
  });

  it('si el servidor la deja entre las omitidas, dice el motivo', async () => {
    mockAsignar.mockResolvedValue({ asignadas: 0, omitidas: [{ id: 'u1', nombre: 'Ana Pérez', motivo: 'Es del personal y no hace el programa' }] });
    await montar();
    await tocar('Asignar el diagnóstico');
    expect(mockAvisar).toHaveBeenCalledWith('No se pudo asignar el diagnóstico', 'Es del personal y no hace el programa');
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('sin la lectura del servidor (backend anterior, sin permiso) no se dibuja nada', async () => {
    mockLeer.mockRejectedValue(new ApiError(404, 'no'));
    await montar();
    expect(textos()).toEqual([]);
    mockLeer.mockRejectedValue(new ApiError(403, 'no'));
    await act(async () => { raiz!.unmount(); });
    await montar();
    expect(textos()).toEqual([]);
  });
});
