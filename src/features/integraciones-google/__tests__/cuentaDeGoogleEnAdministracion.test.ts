/**
 * La pantalla «Cuenta de Google» (spec 040, D-321) está enchufada en Administración, se abre desde «Más opciones» y se dibuja con sus estados:
 * sin credenciales, sin cuenta, conectada, a reconectar. Mezcla lectura del código (el cableado) y un dibujo real de la pantalla con el hook simulado.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaInsetsContext: require('react').createContext(null),
}));
jest.mock('../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
const mockLogro = jest.fn();
jest.mock('../../../utils/tacto', () => ({ tacto: { logro: () => mockLogro(), seleccion: jest.fn(), error: jest.fn() } }));
jest.mock('../../../components/ConfirmacionEnLinea', () => ({
  ConfirmacionEnLinea: ({ texto }: { texto: string }) => require('react').createElement('Text', { testID: 'hecho' }, texto),
}));
const mockConfirmar = jest.fn<(titulo: string, mensaje?: string, opciones?: { ok?: string }) => Promise<boolean>>();
jest.mock('../../admin/utils/dialogo', () => ({ confirmar: (...args: [string, string?, { ok?: string }?]) => mockConfirmar(...args) }));

type Estado = ReturnType<typeof import('../hooks/useCuentaDeGoogle').useCuentaDeGoogle>;
let mockEstado: Partial<Estado> = {};
jest.mock('../hooks/useCuentaDeGoogle', () => ({ useCuentaDeGoogle: () => mockEstado }));

import { CuentaDeGoogleAdminScreen } from '../screens/CuentaDeGoogleAdminScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ADMIN = path.resolve(__dirname, '../../admin/screens');
const leer = (archivo: string) => fs.readFileSync(path.join(ADMIN, archivo), 'utf8');

const conectar = jest.fn<Estado['conectar']>();
const desconectar = jest.fn<Estado['desconectar']>();
const recargar = jest.fn<Estado['recargar']>();

const SIN_CUENTA = { configurada: true, conectada: false, correo: null, estado: null, conectadaEn: null, ultimoUso: null, ultimoError: null, acciones: [] };
const CONECTADA = { ...SIN_CUENTA, conectada: true, correo: 'renasercorporation@gmail.com', estado: 'ACTIVA', conectadaEn: '2026-11-05T15:00:00Z' };
const BASE: Partial<Estado> = { cuenta: SIN_CUENTA, cargando: false, trabajando: false, fallo: null, esperandoAGoogle: false, conectar, desconectar, recargar };

let raiz: ReactTestRenderer | null = null;
function dibujar(cambios: Partial<Estado> = {}): ReactTestRenderer {
  mockEstado = { ...BASE, ...cambios };
  act(() => raiz?.unmount());
  act(() => {
    raiz = TestRenderer.create(React.createElement(CuentaDeGoogleAdminScreen, { onVolver: jest.fn() }));
  });
  return raiz!;
}
const propio = (n: ReactTestInstance) => React.Children.toArray(n.props.children as React.ReactNode).filter(x => typeof x === 'string').join('');
const textos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'Text').map(propio);
const todo = (r: ReactTestRenderer) => textos(r).join(' ');
const boton = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance[] =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta);

beforeEach(() => {
  conectar.mockReset().mockResolvedValue(true);
  desconectar.mockReset().mockResolvedValue(true);
  recargar.mockReset().mockResolvedValue(undefined);
  mockConfirmar.mockReset().mockResolvedValue(true);
  mockLogro.mockReset();
});

describe('cableado en Administración', () => {
  // spec 040 FR-015
  it('AdminScreen tiene la vista y «Más opciones» la abre', () => {
    const admin = leer('AdminScreen.tsx');
    expect(admin).toMatch(/\{\s*nombre:\s*'cuenta-de-google'\s*\}/);
    expect(admin).toMatch(/<CuentaDeGoogleAdminScreen onVolver=\{volver\}/);
    expect(admin).toMatch(/onAbrirCuentaDeGoogle=\{\(\) => entrar\(\{ nombre: 'cuenta-de-google' \}\)\}/);
  });

  // spec 040 FR-015
  it('«Más opciones» la ofrece y sigue la disponibilidad de la gestión de eventos (solo ADMIN y ALCHEMIST llegan a Administración)', () => {
    const mas = leer('MasOpcionesScreen.tsx');
    expect(mas).toMatch(/titulo: 'Cuenta de Google'/);
    expect(mas).toMatch(/onPress: onAbrirCuentaDeGoogle/);
    expect(mas).toMatch(/clave: CLAVES\.eventosGestion/);
  });
});

describe('la pantalla', () => {
  // spec 040 FR-010
  it('sin credenciales en el servidor: lo dice y NO ofrece conectar', () => {
    const r = dibujar({ cuenta: { ...SIN_CUENTA, configurada: false } });

    expect(todo(r)).toContain('El servidor todavía no tiene las credenciales de Google');
    expect(boton(r, 'Conectar cuenta de Google')).toHaveLength(0);
  });

  // spec 040 FR-010
  it('sin cuenta: «Conectar cuenta de Google» llama a conectar', async () => {
    const r = dibujar();

    expect(todo(r)).toContain('Todavía no hay una cuenta de Google conectada.');
    const boton1 = boton(r, 'Conectar cuenta de Google').find(n => n.props.accessibilityState !== undefined);
    await act(async () => {
      boton1?.props.onPress();
    });
    expect(conectar).toHaveBeenCalledTimes(1);
  });

  // spec 040 FR-010
  it('conectada: el correo, desde cuándo y «Volver a conectar» / «Desconectar»; nunca un permiso ni un token', () => {
    const r = dibujar({ cuenta: CONECTADA });

    expect(todo(r)).toContain('Conectada');
    expect(todo(r)).toContain('renasercorporation@gmail.com');
    expect(todo(r)).toMatch(/Conectada el \d{1,2} nov 2026/);
    expect(boton(r, 'Volver a conectar').length).toBeGreaterThan(0);
    expect(boton(r, 'Desconectar').length).toBeGreaterThan(0);
    expect(todo(r).toLowerCase()).not.toMatch(/token|refresh|secret/);
  });

  // spec 040 FR-009
  it('revocada: dice que hay que volver a conectarla y que no se crean enlaces nuevos', () => {
    const r = dibujar({ cuenta: { ...CONECTADA, estado: 'REVOCADA', ultimoError: 'Hay que volver a conectar la cuenta de Google' } });

    expect(todo(r)).toContain('Hay que volver a conectarla');
    expect(todo(r)).toContain('Mientras tanto no se crean enlaces nuevos.');
    expect(todo(r)).toContain('Último problema: Hay que volver a conectar la cuenta de Google');
  });

  // spec 040 FR-010
  it('al abrir Google dice «Termina en el navegador y vuelve a Renaser.»', () => {
    const r = dibujar({ esperandoAGoogle: true });

    expect(todo(r)).toContain('Termina en el navegador y vuelve a Renaser.');
  });

  // spec 040 FR-016
  it('las últimas acciones salen en palabras, con quién, el resultado en texto (no solo en color) y la fecha', () => {
    const r = dibujar({
      cuenta: {
        ...CONECTADA,
        acciones: [
          { en: '2026-11-05T15:05:00Z', accion: 'CREAR_SALA', quien: 'el sistema', exito: false, codigoHttp: 503 },
          { en: '2026-11-05T15:00:00Z', accion: 'CONECTAR', quien: 'Kelin', exito: true, codigoHttp: null },
        ],
      },
    });

    expect(todo(r)).toContain('Últimas acciones');
    expect(todo(r)).toContain('Creó una sala · el sistema');
    expect(todo(r)).toContain('No salió');
    expect(todo(r)).toContain('Conectó la cuenta · Kelin');
    expect(todo(r)).toContain('Salió bien');
  });
});

describe('desconectar', () => {
  // spec 040 FR-010
  it('pide confirmación diciendo que los enlaces ya creados siguen, desconecta y dice «Cuenta desconectada.» con vibración de logro', async () => {
    const r = dibujar({ cuenta: CONECTADA });

    await act(async () => {
      boton(r, 'Desconectar').find(n => n.props.accessibilityState !== undefined)?.props.onPress();
    });

    expect(mockConfirmar).toHaveBeenCalledWith('¿Desconectar la cuenta de Google?', expect.stringContaining('siguen funcionando'), { ok: 'Desconectar' });
    expect(desconectar).toHaveBeenCalledTimes(1);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(textos(raiz!)).toContain('Cuenta desconectada.');
  });

  // spec 040 FR-010
  it('si la persona se arrepiente en la confirmación, no se manda nada', async () => {
    mockConfirmar.mockResolvedValue(false);
    const r = dibujar({ cuenta: CONECTADA });

    await act(async () => {
      boton(r, 'Desconectar').find(n => n.props.accessibilityState !== undefined)?.props.onPress();
    });

    expect(desconectar).not.toHaveBeenCalled();
    expect(mockLogro).not.toHaveBeenCalled();
  });
});

describe('los fallos', () => {
  // spec 040 FR-015
  it('un 403 dice que la cuenta no puede y no ofrece reintentar; la falta de red sí', () => {
    expect(todo(dibujar({ cuenta: null, fallo: 'sin_permiso' }))).toContain('Tu cuenta no puede ver ni cambiar esto.');
    expect(boton(dibujar({ cuenta: null, fallo: 'sin_permiso' }), 'Reintentar')).toHaveLength(0);

    const r = dibujar({ cuenta: null, fallo: 'sin_red' });
    expect(todo(r)).toContain('Sin conexión con el servidor.');
    expect(boton(r, 'Reintentar').length).toBeGreaterThan(0);
  });

  // spec 040 FR-020
  it('un servidor anterior (404) dice que todavía no está disponible', () => {
    expect(todo(dibujar({ cuenta: null, fallo: 'no_disponible' }))).toContain('todavía no está disponible');
  });
});
