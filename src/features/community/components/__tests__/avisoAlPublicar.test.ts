import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Issue #149 (E2E de regresión del 06/11): si publicar en el Muro falla —la foto no sube a S3, o no hay red—, la persona tiene que
 * leer un motivo claro, en castellano y sin jerga, DENTRO del compositor y con «Reintentar».
 *
 * Contra el código de antes estas pruebas fallan: `mensajeDeFalloAlPublicar` vivía en ComunidadScreen y devolvía `error.message`
 * crudo («fetch failed: java.net.ConnectException: Failed to connect to localhost/127.0.0.1:9002»), un fallo de red decía
 * «Revisa que el backend esté corriendo», y el motivo iba en un `Alert` que quedaba detrás del compositor reabierto (y, en el
 * recorrido de bienvenida de la spec 045, detrás de su velo): parecía que «Publicar» no hacía nada.
 */

let mockModo: 'light' | 'dark' = 'light';
const mockTacto = { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() };

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({
      mode: mockModo,
      c: mockModo === 'dark' ? tokens.dark : tokens.light,
      t: tokens.type,
      space: tokens.space,
      toggle: () => undefined,
      setMode: () => undefined,
    }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
  };
});
jest.mock('../../../../utils/tacto', () => ({
  tacto: {
    seleccion: () => mockTacto.seleccion(),
    error: () => mockTacto.error(),
    logro: () => mockTacto.logro(),
  },
}));


import { ApiError } from '../../../../services/http/apiClient';
import { NuevaPublicacion, type NuevaPublicacionProps } from '../NuevaPublicacion';
import { FALLO_AL_PUBLICAR, SIN_CONEXION_AL_PUBLICAR, mensajeDeFalloAlPublicar } from '../../utils/mensajeDeFalloAlPublicar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockModo = 'light';
});

const FOTO = { uri: 'file:///foto-1.jpg', mimeType: 'image/jpeg', nombre: 'foto-1.jpg', width: 1440, height: 1080 };

function montar(props: Partial<NuevaPublicacionProps> = {}): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(NuevaPublicacion, {
        visible: true,
        alCancelar: () => undefined,
        alPublicar: () => undefined,
        publicando: false,
        autor: { nombre: 'Emu Aprendiz', firma: 'Día 15' },
        texto: 'Hola, vengo a cambiar',
        alCambiarTexto: () => undefined,
        categorias: { lista: [], cargando: false, error: null, recargar: () => undefined, elegida: null, alElegir: () => undefined },
        fotos: { lista: [FOTO], agregando: false, alAgregar: () => undefined, alQuitar: () => undefined },
        ...props,
      }),
    );
  });
  return raiz!;
}

const textos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => typeof n.type === 'string' && (typeof n.props.children === 'string' || Array.isArray(n.props.children)))
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string').join(''));

describe('mensajeDeFalloAlPublicar (issue #149)', () => {
  it('la foto que no sube a S3 (un fetch que falla) dice «Revisa tu conexión», nunca el error técnico', () => {
    const error = new TypeError('fetch failed: java.net.ConnectException: Failed to connect to localhost/127.0.0.1:9002');
    expect(mensajeDeFalloAlPublicar(error)).toBe(SIN_CONEXION_AL_PUBLICAR);
    expect(mensajeDeFalloAlPublicar(error)).not.toMatch(/fetch|java|localhost|9002/);
  });

  it('sin red al servidor dice lo mismo, sin hablar del «backend»', () => {
    const error = new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
    expect(mensajeDeFalloAlPublicar(error)).toBe(SIN_CONEXION_AL_PUBLICAR);
    expect(SIN_CONEXION_AL_PUBLICAR).toBe('No pudimos publicar. Revisa tu conexión e inténtalo de nuevo.');
  });

  it('un motivo del servidor pensado para leerse se respeta; un 5xx o un «Forbidden» en inglés, no', () => {
    expect(mensajeDeFalloAlPublicar(new ApiError(400, 'Esta publicación necesita al menos una foto.'))).toBe(
      'Esta publicación necesita al menos una foto.',
    );
    expect(mensajeDeFalloAlPublicar(new ApiError(500, 'NullPointerException at WallService'))).toBe(FALLO_AL_PUBLICAR);
    expect(mensajeDeFalloAlPublicar(new ApiError(403, 'Forbidden'))).toBe(FALLO_AL_PUBLICAR);
  });

  it('el texto de red de la app ya no habla del «backend» a la persona', () => {
    const cliente = fs.readFileSync(path.join(__dirname, '../../../../services/http/apiClient.ts'), 'utf8');
    expect(cliente).not.toMatch(/backend esté corriendo/);
  });
});

describe('el compositor dice por qué no se publicó, con «Reintentar» (issue #149)', () => {
  it('sin error no hay aviso', () => {
    const r = montar();
    expect(r.root.findAll(n => n.props.testID === 'error-al-publicar')).toHaveLength(0);
  });

  it('con error se lee el motivo dentro del compositor, como alerta para el lector de pantalla', () => {
    const r = montar({ errorAlPublicar: SIN_CONEXION_AL_PUBLICAR });
    const [aviso] = r.root.findAll(n => n.props.testID === 'error-al-publicar' && typeof n.type === 'string');
    expect(aviso).toBeDefined();
    expect(aviso.props.accessibilityRole).toBe('alert');
    expect(textos(r)).toEqual(expect.arrayContaining([SIN_CONEXION_AL_PUBLICAR, 'Reintentar']));
  });

  it('«Reintentar» vuelve a publicar (un toque, un pedido) y mide 48 o más', () => {
    const alPublicar = jest.fn();
    const r = montar({ errorAlPublicar: SIN_CONEXION_AL_PUBLICAR, alPublicar });
    const [boton] = r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Reintentar');
    act(() => boton.props.onPress());
    expect(alPublicar).toHaveBeenCalledTimes(1);
    const estilo = [].concat(typeof boton.props.style === 'function' ? boton.props.style({ pressed: false }) : boton.props.style);
    expect(Math.max(...estilo.map((s: { minHeight?: number }) => s?.minHeight ?? 0))).toBeGreaterThanOrEqual(48);
  });

  it('mientras publica, «Reintentar» dice «Publicando…» y no manda otro pedido', () => {
    const alPublicar = jest.fn();
    const r = montar({ errorAlPublicar: SIN_CONEXION_AL_PUBLICAR, alPublicar, publicando: true });
    expect(textos(r)).toContain('Publicando…');
    const [boton] = r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Reintentar');
    act(() => boton.props.onPress());
    expect(alPublicar).not.toHaveBeenCalled();
  });

  it('se ve en oscuro también', () => {
    mockModo = 'dark';
    const r = montar({ errorAlPublicar: SIN_CONEXION_AL_PUBLICAR });
    expect(textos(r)).toContain(SIN_CONEXION_AL_PUBLICAR);
  });

  it('ComunidadScreen ya no muestra el fallo de publicar en un Alert: lo pasa al compositor', () => {
    const pantalla = fs.readFileSync(path.join(__dirname, '../../../../screens/ComunidadScreen.tsx'), 'utf8');
    expect(pantalla).not.toMatch(/Alert\.alert\('No se pudo publicar'/);
    expect(pantalla).toMatch(/setErrorAlPublicar\(mensajeDeFalloAlPublicar\(error\)\)/);
    expect(pantalla).toMatch(/errorAlPublicar=\{errorAlPublicar\}/);
  });
});
