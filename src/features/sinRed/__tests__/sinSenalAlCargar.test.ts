/**
 * Spec 048, #182: «sin señal se dice sin señal». El helper único (`mensajeDeCarga`, `ErrorDeCarga`, `useRecargarAlVolverLaSenal`) y las
 * lecturas de Hoy, Yo y Comunidad que ya lo usan. La regla que frena la copia a mano es `src/__tests__/reglas/sinSenalSeDiceSinSenal.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
const mockResumen = jest.fn<() => Promise<unknown>>();
jest.mock('../../home/api/homeApi', () => ({ obtenerResumenHome: () => mockResumen() }));
const mockEvidencias = jest.fn<() => Promise<unknown>>();
jest.mock('../../evidence/api/evidenceApi', () => ({ listarMisEvidencias: () => mockEvidencias() }));
jest.mock('@react-navigation/native', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return { useFocusEffect: (cb: () => void) => R.useEffect(cb, [cb]) };
});

import { ApiError } from '../../../services/http/apiClient';
import { light } from '../../../theme/tokens';
import { useMisEvidencias } from '../../evidence/hooks/useMisEvidencias';
import { useResumenHome } from '../../home/hooks/useResumenHome';
import { ErrorDeCarga } from '../components/ErrorDeCarga';
import { _reiniciarConexion, marcarConConexion, marcarSinConexion } from '../estadoDeConexion';
import { useRecargarAlVolverLaSenal } from '../useRecargarAlVolverLaSenal';
import {
  TEXTO_SIN_SENAL_AL_CARGAR,
  TEXTO_SIN_SENAL_EN_LINEA,
  esSinSenal,
  esTextoSinSenal,
  mensajeDeCarga,
  mensajeDeCargaEnLinea,
} from '../utils/sinSenal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SIN_RED = () => new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
let raiz: ReactTestRenderer | null = null;
const primero = (tipo: string) => raiz!.root.findAll(x => (x.type as unknown) === tipo)[0];

beforeEach(() => _reiniciarConexion());
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockResumen.mockReset();
  mockEvidencias.mockReset();
  _reiniciarConexion();
});

describe('mensajeDeCarga', () => {
  it('sin señal (status 0) no dice «No se pudo conectar con el servidor»: dice que no hay nada guardado y que se cargará solo', () => { // spec 048 FR-004
    expect(esSinSenal(SIN_RED())).toBe(true);
    expect(mensajeDeCarga(SIN_RED(), 'No pudimos cargar tu día.')).toBe(TEXTO_SIN_SENAL_AL_CARGAR);
    expect(TEXTO_SIN_SENAL_AL_CARGAR).not.toMatch(/No se pudo conectar/);
  });

  it('para lo que nunca se guarda en el teléfono usa las palabras de «Necesitas conexión para usar esto»', () => { // spec 048 FR-005
    expect(mensajeDeCargaEnLinea(SIN_RED(), 'No pudimos cargar los cursos.')).toBe(TEXTO_SIN_SENAL_EN_LINEA);
    expect(TEXTO_SIN_SENAL_EN_LINEA).toContain('Necesitas conexión para usar esto');
    expect(esTextoSinSenal(TEXTO_SIN_SENAL_EN_LINEA) && esTextoSinSenal(TEXTO_SIN_SENAL_AL_CARGAR)).toBe(true);
  });

  it('cualquier otro error conserva su texto de siempre (el del servidor, o el de por defecto)', () => {
    expect(esSinSenal(new ApiError(500, 'x'))).toBe(false);
    expect(mensajeDeCarga(new ApiError(409, 'Esa semana ya está armada.'), 'No pudimos cargar.')).toBe('Esa semana ya está armada.');
    expect(mensajeDeCarga(new Error('boom'), 'No pudimos cargar.')).toBe('No pudimos cargar.');
    expect(mensajeDeCarga(new Error('boom'), 'por defecto', (_e, d) => `traducido: ${d}`)).toBe('traducido: por defecto');
    expect(esTextoSinSenal('No pudimos cargar.')).toBe(false);
  });
});

describe('ErrorDeCarga', () => {
  const pintar = (mensaje: string, caja?: object) => {
    act(() => {
      raiz = TestRenderer.create(React.createElement(ErrorDeCarga, { mensaje, caja }));
    });
    const texto = primero('Text');
    return { color: StyleSheet.flatten(texto.props.style).color, rol: texto.props.accessibilityRole };
  };

  it('«sin señal» va en el color suave y sin rol de alerta; un error de verdad, en rojo y como alerta', () => { // spec 048 FR-004
    expect(pintar(TEXTO_SIN_SENAL_AL_CARGAR)).toEqual({ color: light.textSoft, rol: undefined });
    act(() => raiz?.unmount());
    expect(pintar('No pudimos cargar tu día.')).toEqual({ color: light.danger, rol: 'alert' });
  });

  it('con `caja`, el recuadro también deja el rojo cuando es «sin señal»', () => { // spec 048 FR-004
    pintar(TEXTO_SIN_SENAL_AL_CARGAR, { borderLeftWidth: 2 });
    const caja = primero('View');
    expect(StyleSheet.flatten(caja.props.style)).toMatchObject({ borderLeftWidth: 2, backgroundColor: light.cardBgAlt, borderColor: light.border });
    act(() => raiz?.unmount());
    pintar('No pudimos cargar tu día.', { borderLeftWidth: 2 });
    expect(StyleSheet.flatten(primero('View').props.style)).toMatchObject({ backgroundColor: light.dangerWash, borderColor: light.danger });
  });
});

describe('useRecargarAlVolverLaSenal', () => {
  const montar = (recargar: () => void, hayError: boolean) => {
    function Sonda({ hayError }: { hayError: boolean }) {
      useRecargarAlVolverLaSenal(recargar, hayError);
      return null;
    }
    act(() => {
      raiz = TestRenderer.create(React.createElement(Sonda, { hayError }));
    });
    return (nuevo: boolean) => act(() => raiz!.update(React.createElement(Sonda, { hayError: nuevo })));
  };

  it('con un error, vuelve a pedir al volver la señal; sin error no toca nada', () => { // spec 048 FR-005
    const recargar = jest.fn();
    const poner = montar(recargar, false);
    marcarSinConexion();
    marcarConConexion();
    expect(recargar).not.toHaveBeenCalled();
    poner(true);
    marcarSinConexion();
    marcarConConexion();
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('usa siempre la última función de recarga', () => {
    const vieja = jest.fn();
    const nueva = jest.fn();
    function Sonda({ f }: { f: () => void }) {
      useRecargarAlVolverLaSenal(f, true);
      return null;
    }
    act(() => {
      raiz = TestRenderer.create(React.createElement(Sonda, { f: vieja }));
    });
    act(() => raiz!.update(React.createElement(Sonda, { f: nueva })));
    marcarSinConexion();
    marcarConConexion();
    expect(vieja).not.toHaveBeenCalled();
    expect(nueva).toHaveBeenCalledTimes(1);
  });
});

describe('lecturas de otras pantallas que ya dicen «sin señal»', () => {
  async function montar<T>(usar: () => T): Promise<() => T> {
    let valor!: T;
    function Sonda() {
      valor = usar();
      return null;
    }
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(Sonda));
    });
    return () => valor;
  }

  it('Hoy (useResumenHome): sin la lectura guardada dice «sin señal» y se pide sola al volver la señal', async () => { // spec 048 FR-004
    marcarSinConexion();
    mockResumen.mockRejectedValueOnce(SIN_RED());
    const h = await montar(() => useResumenHome());
    expect(h().error).toBe(TEXTO_SIN_SENAL_AL_CARGAR);
    mockResumen.mockResolvedValue({ inscrito: false, diaPrograma: 0 });
    await act(async () => marcarConConexion());
    expect(h().error).toBeNull();
  });

  it('Yo (useMisEvidencias): sin señal dice «Necesitas conexión…»; lo que no es de red conserva su mensaje', async () => { // spec 048 FR-005
    marcarSinConexion();
    mockEvidencias.mockRejectedValueOnce(SIN_RED());
    const h = await montar(() => useMisEvidencias());
    expect(h().error).toBe(TEXTO_SIN_SENAL_EN_LINEA);
    act(() => raiz?.unmount());
    mockEvidencias.mockRejectedValueOnce(new Error('Respuesta inválida del servidor'));
    const g = await montar(() => useMisEvidencias());
    expect(g().error).toBe('Respuesta inválida del servidor');
  });
});
