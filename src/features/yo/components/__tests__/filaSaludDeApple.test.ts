/**
 * «Salud de Apple» visible en la app (issue #255, norma 2.5.1 de la App Store; decisión del dueño del 2026-11-24): la fila de Yo
 * (solo iOS), su estado, la hoja con el ícono oficial y el nombre completo en los textos de iPhone.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Platform } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../legal/enlacesLegales', () => ({ abrirPoliticaDePrivacidad: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockSoporte = jest.fn<() => Promise<'disponible' | 'no-disponible'>>();
const mockPedir = jest.fn<() => Promise<boolean>>();
const mockAbrirSalud = jest.fn();
jest.mock('../../../pasos/services/saludConectada', () => ({
  soporteDeSalud: () => mockSoporte(),
  pedirPermisosDeSalud: () => mockPedir(),
  permisosDeSalud: async () => 'faltan',
  abrirHealthConnect: () => mockAbrirSalud(),
  leerLosPasosDelDia: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { guardarLaConexion } from '../../../pasos/services/conexionDeLosPasos';
import { TEXTOS_DE_PASOS_EN_IPHONE } from '../../../pasos/utils/textosDePasos';
import { detalleDeSaludDeApple, FilaSaludDeApple, muestraSaludDeApple } from '../FilaSaludDeApple';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
const montar = async (cuenta: string | null = 'ana') => {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(FilaSaludDeApple, { cuentaId: cuenta }));
  });
  await act(async () => {
    await Promise.resolve();
  });
};
const textosDeNodos = (nodos: ReactTestInstance[]): string =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .join(' | ');
const textos = () => textosDeNodos(raiz!.root.findAll(() => true));
const fila = () => raiz!.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityRole === 'button')[0];
const boton = (etiqueta: string) =>
  raiz!.root.findAll(n => typeof n.props.onPress === 'function' && (n.props.accessibilityLabel === etiqueta || textosDeNodos(n.findAll(() => true)) === etiqueta))[0];

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await AsyncStorage.clear();
  mockSoporte.mockReset().mockResolvedValue('disponible');
  mockPedir.mockReset().mockResolvedValue(true);
  mockAbrirSalud.mockReset();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('Yo → «Salud de Apple»', () => {
  it('se muestra solo en iOS: Android y la web no', () => {
    expect(muestraSaludDeApple('ios')).toBe(true);
    expect(muestraSaludDeApple('android')).toBe(false);
    expect(muestraSaludDeApple('web')).toBe(false);
  });

  it('YoScreen la pone en Preferencias detrás de esa condición (y solo ahí)', () => {
    const yo = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '..', 'screens', 'YoScreen.tsx'), 'utf-8');
    expect(yo).toContain('muestraSaludDeApple(Platform.OS) ? <FilaSaludDeApple');
    expect(yo.match(/<FilaSaludDeApple/g)).toHaveLength(1);
  });

  it('sin conectar: el nombre completo, «Sin conectar», una fila entera de 56 que se toca y abre la hoja', async () => {
    await montar();
    expect(textos()).toContain('Salud de Apple');
    expect(textos()).toContain('Sin conectar');
    expect(fila().props.accessibilityLabel).toBe('Salud de Apple. Sin conectar');
    expect(raiz!.root.findAll(n => n.props.testID === 'logo-salud-de-apple').length).toBeGreaterThan(0);
    act(() => fila().props.onPress());
    expect(textos()).toContain('Cuenta tus km solo');
    expect(textos()).toContain('Con Salud de Apple.');
    expect(boton('Conectar')).toBeDefined();
  });

  it('el ícono es decoración: no es un botón ni lo anuncia el lector, y lleva el margen de 1/10', async () => {
    await montar();
    const logo = raiz!.root.findAll(n => n.props.testID === 'logo-salud-de-apple')[0];
    expect(logo.props['aria-hidden']).toBe(true);
    expect(logo.findAll(n => typeof n.props.onPress === 'function')).toHaveLength(0);
    const estilo = Object.assign({}, ...[logo.props.style].flat(3).filter(Boolean));
    expect(estilo.padding).toBeCloseTo(2.4);
    expect(estilo.width).toBeCloseTo(28.8);
  });

  it('conectada: dice «Conectada» y la hoja ofrece «Desconectar», que abre Salud y deja la fila «Sin conectar»', async () => {
    await guardarLaConexion('ana', new Date());
    await montar();
    expect(textos()).toContain('Conectada');
    act(() => fila().props.onPress());
    expect(textos()).toContain('Ya contamos tus pasos');
    expect(textos()).toContain('Salud de Apple');
    await act(async () => {
      boton('Desconectar')!.props.onPress();
    });
    expect(mockAbrirSalud).toHaveBeenCalledTimes(1);
    expect(textos()).toContain('Sin conectar');
  });

  it('«Conectar» pide el permiso a Salud y deja la fila «Conectada»', async () => {
    await montar();
    act(() => fila().props.onPress());
    await act(async () => {
      boton('Conectar')!.props.onPress();
    });
    expect(mockPedir).toHaveBeenCalledTimes(1);
    expect(textos()).toContain('Conectada');
    expect(textos()).toContain('Ya contamos tus pasos');
  });

  it('si el permiso no se da, la hoja lo dice y la fila sigue «Sin conectar»', async () => {
    mockPedir.mockResolvedValue(false);
    await montar();
    act(() => fila().props.onPress());
    await act(async () => {
      boton('Conectar')!.props.onPress();
    });
    expect(textos()).toContain(TEXTOS_DE_PASOS_EN_IPHONE.errores.noSePudoConectar);
    expect(textos()).toContain('Sin conectar');
  });

  it('un iPad sin Salud: «No disponible en este dispositivo», sin toque y sin hueco', async () => {
    mockSoporte.mockResolvedValue('no-disponible');
    await montar();
    expect(textos()).toContain('Salud de Apple');
    expect(textos()).toContain('No disponible en este dispositivo');
    expect(fila()).toBeUndefined();
  });

  it('mientras revisa, la fila dice «Revisando…»: nunca queda sin estado', () => {
    expect(detalleDeSaludDeApple('cargando')).toBe('Revisando…');
    expect(detalleDeSaludDeApple('conectada')).toBe('Conectada');
    expect(detalleDeSaludDeApple('sin-conectar')).toBe('Sin conectar');
    expect(detalleDeSaludDeApple('no-disponible')).toBe('No disponible en este dispositivo');
  });
});

describe('los textos de iPhone nombran «Salud de Apple»', () => {
  // spec 037 FR-022
  it('ningún texto de iPhone dice «Salud» a secas ni «la app Salud»', () => {
    const todo = JSON.stringify(TEXTOS_DE_PASOS_EN_IPHONE);
    const sueltas = [...todo.matchAll(/Salud(?! de Apple)/g)];
    expect(sueltas.map(m => todo.slice(Math.max(0, m.index! - 20), m.index! + 20))).toEqual([]);
    expect(todo).not.toMatch(/la app Salud/);
  });
});

describe('el ícono oficial de Apple', () => {
  const assets = path.resolve(__dirname, '..', '..', '..', '..', '..', 'assets', 'salud-de-apple');
  it('está en tres tamaños (@1x, @2x, @3x) y la licencia de Apple va al lado', () => {
    for (const nombre of ['iconoSaludDeApple.png', 'iconoSaludDeApple@2x.png', 'iconoSaludDeApple@3x.png', 'LICENCIA-Apple-Health-Icon.rtf']) {
      expect(fs.existsSync(path.join(assets, nombre))).toBe(true);
    }
  });

  it('solo lo carga el archivo de iOS: Android y la web no llevan el ícono (la licencia lo permite solo en iOS)', () => {
    const componentes = path.resolve(__dirname, '..', '..', '..', 'pasos', 'components');
    expect(fs.readFileSync(path.join(componentes, 'LogoSaludDeApple.ios.tsx'), 'utf-8')).toContain('iconoSaludDeApple.png');
    expect(fs.readFileSync(path.join(componentes, 'LogoSaludDeApple.tsx'), 'utf-8')).not.toContain('iconoSaludDeApple');
  });
});
