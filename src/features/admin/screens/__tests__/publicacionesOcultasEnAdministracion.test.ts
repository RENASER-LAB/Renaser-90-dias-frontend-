/**
 * «Publicaciones ocultas» (pedido del dueño, 2026-10-31) está enchufada en Administración, se abre desde «Más opciones»
 * y se dibuja con sus estados. Mezcla lectura del código (el cableado, como las otras de Administración) y un dibujo
 * real de la pantalla con el mockEstado de la lista simulado.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaInsetsContext: require('react').createContext(null),
}));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../community/components/FotoMuro', () => ({ FotoMuro: () => null }));
const mockVolver = jest.fn();
jest.mock('../../../../hooks/useSystemBackHandler', () => ({
  useSystemBackHandler: (manejador: () => boolean) => {
    mockVolver.mockImplementation(manejador);
  },
}));

type Estado = ReturnType<typeof import('../../hooks/usePublicacionesOcultas').usePublicacionesOcultas>;
let mockEstado: Partial<Estado> = {};
jest.mock('../../hooks/usePublicacionesOcultas', () => ({ usePublicacionesOcultas: () => mockEstado }));

import { PublicacionesOcultasScreen } from '../PublicacionesOcultasScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PANTALLAS = path.resolve(__dirname, '..');
const leer = (archivo: string) => fs.readFileSync(path.join(PANTALLAS, archivo), 'utf8');

const recargar = jest.fn<() => Promise<void>>();
const devolver = jest.fn<(id: string) => Promise<void>>();
const eliminar = jest.fn<(id: string) => void>();
const traerMas = jest.fn<() => Promise<void>>();

const BASE: Partial<Estado> = {
  filas: [],
  cargando: false,
  cargandoMas: false,
  fallo: null,
  falloAlTraerMas: false,
  hayMas: false,
  ocupadas: {},
  aviso: null,
  cerrarAviso: jest.fn(),
  recargar,
  traerMas,
  devolver,
  eliminar,
};

const fila = (id: string, cambios: Record<string, unknown> = {}) => ({
  id,
  authorId: 'u1',
  authorName: 'Ana Pérez',
  authorAvatarUrl: null,
  type: 'MANUAL',
  category: null,
  text: 'Una publicación',
  media: [],
  createdAt: '2026-10-30T18:00:00Z',
  reactionCounts: {},
  myReactions: [],
  commentCount: 0,
  ...cambios,
});

let raiz: ReactTestRenderer | null = null;
function dibujar(cambios: Partial<Estado>): ReactTestRenderer {
  mockEstado = { ...BASE, ...cambios };
  act(() => raiz?.unmount());
  act(() => {
    raiz = TestRenderer.create(React.createElement(PublicacionesOcultasScreen, { onVolver: jest.fn() }));
  });
  return raiz!;
}
const textos = (r: ReactTestRenderer) =>
  r.root.findAll(n => typeof n.type === 'string' && n.type === 'Text').map(n => [n.props.children].flat().join(''));
const boton = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance[] =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta);

beforeEach(() => {
  recargar.mockReset();
  devolver.mockReset();
  eliminar.mockReset();
  traerMas.mockReset();
});

describe('cableado en Administración', () => {
  it('AdminScreen tiene la vista y Más opciones la abre', () => {
    const admin = leer('AdminScreen.tsx');
    expect(admin).toMatch(/\{\s*nombre:\s*'publicaciones-ocultas'\s*\}/);
    expect(admin).toMatch(/<PublicacionesOcultasScreen onVolver=\{volver\}/);
    expect(admin).toMatch(/onAbrirPublicacionesOcultas=\{\(\) => entrar\(\{ nombre: 'publicaciones-ocultas' \}\)\}/);
  });

  it('«Más opciones» la ofrece en «Desde acá» y ya no dice que moderar es del panel web', () => {
    const mas = leer('MasOpcionesScreen.tsx');
    expect(mas).toMatch(/titulo: 'Publicaciones ocultas'/);
    expect(mas).toMatch(/onPress: onAbrirPublicacionesOcultas/);
    expect(mas).not.toMatch(/Moderar exige ver la publicación entera/);
  });

  it('el atrás del sistema vuelve a «Más opciones» (sube un nivel de la pila)', () => {
    expect(leer('PublicacionesOcultasScreen.tsx')).toMatch(/useSystemBackHandler/);
    dibujar({});
    const onVolver = jest.fn();
    mockEstado = { ...BASE };
    act(() => raiz?.unmount());
    act(() => {
      raiz = TestRenderer.create(React.createElement(PublicacionesOcultasScreen, { onVolver }));
    });
    expect(mockVolver()).toBe(true);
    expect(onVolver).toHaveBeenCalledTimes(1);
  });
});

describe('el aviso de «Publicación devuelta al Muro»', () => {
  it('es el snackbar de abajo (opaco, encima de los botones flotantes), no una línea flotando arriba', () => {
    const fuentePantalla = leer('PublicacionesOcultasScreen.tsx');
    expect(fuentePantalla).toMatch(/<AvisoDeAbajo aviso=\{aviso\} onTerminar=\{estado\.cerrarAviso\} \/>/);
    expect(fuentePantalla).not.toMatch(/ConfirmacionEnLinea/);
    expect(fuentePantalla).not.toMatch(/top: 8/);
  });

  it('se dibuja cuando el hook tiene un aviso', () => {
    const r = dibujar({ filas: [], aviso: { clave: 1, texto: 'Publicación devuelta al Muro' } });
    expect(textos(r)).toContain('Publicación devuelta al Muro');
    expect(r.root.findAll(n => n.type === 'View' && n.props.testID === 'aviso-de-abajo')).toHaveLength(1);
    expect(textos(dibujar({ filas: [] }))).not.toContain('Publicación devuelta al Muro');
  });
});

describe('la pantalla', () => {
  it('cargando', () => {
    expect(textos(dibujar({ filas: null, cargando: true }))).toContain('Cargando las publicaciones ocultas…');
  });

  it('vacía', () => {
    expect(textos(dibujar({ filas: [] }))).toContain('No hay publicaciones ocultas.');
  });

  it('con error: lo dice y ofrece «Reintentar»; el 403 no ofrece reintentar', () => {
    const r = dibujar({ filas: null, fallo: 'error' });
    expect(textos(r)).toContain('No se pudieron cargar las publicaciones ocultas.');
    act(() => boton(r, 'Reintentar')[0].props.onPress());
    expect(recargar).toHaveBeenCalledTimes(1);
    const sin = dibujar({ filas: null, fallo: 'sin_permiso' });
    expect(textos(sin)).toContain('No tienes permiso para moderar el Muro.');
    expect(boton(sin, 'Reintentar')).toHaveLength(0);
    expect(textos(dibujar({ filas: null, fallo: 'sin_red' }))).toContain('Sin conexión con el servidor.');
  });

  it('cada publicación: autor, texto recortado a dos líneas, y las dos acciones', () => {
    const r = dibujar({ filas: [fila('a', { text: 'Mi texto' }), fila('b', { authorName: null, text: '   ' })] as never });
    const t = textos(r);
    expect(t).toContain('Ana Pérez');
    expect(t).toContain('Mi texto');
    expect(t).toContain('Miembro Renaser');
    expect(t).toContain('Sin texto');
    expect(t).toContain('30 de octubre, 13:00');
    const dosLineas = r.root.findAll(n => n.type === 'Text' && n.props.numberOfLines === 2);
    expect(dosLineas.length).toBeGreaterThanOrEqual(2);
    expect(boton(r, 'Devolver al Muro')).toHaveLength(2);
    expect(boton(r, 'Eliminar para siempre')).toHaveLength(2);
    act(() => boton(r, 'Devolver al Muro')[1].props.onPress());
    expect(devolver).toHaveBeenCalledWith('b');
    act(() => boton(r, 'Eliminar para siempre')[0].props.onPress());
    expect(eliminar).toHaveBeenCalledWith('a');
  });

  it('con una foto, la miniatura dice cuántas hay para el lector de pantalla', () => {
    const r = dibujar({
      filas: [fila('a', { media: [{ url: 'https://x/1.jpg', mimeType: 'image/jpeg' }, { url: 'https://x/2.jpg', mimeType: 'image/jpeg' }] })] as never,
    });
    expect(r.root.findAll(n => n.props.accessibilityLabel === '2 fotos').length).toBeGreaterThan(0);
  });

  it('una fila con una acción en curso apaga sus dos botones', () => {
    const r = dibujar({ filas: [fila('a')] as never, ocupadas: { a: 'devolver' } });
    expect(boton(r, 'Devolver al Muro')[0].props.disabled).toBe(true);
    expect(boton(r, 'Eliminar para siempre')[0].props.disabled).toBe(true);
  });

  it('con más páginas ofrece «Ver más publicaciones»; si falló, «Reintentar»', () => {
    const r = dibujar({ filas: [fila('a')] as never, hayMas: true });
    act(() => boton(r, 'Ver más publicaciones')[0].props.onPress());
    expect(traerMas).toHaveBeenCalledTimes(1);
    const f = dibujar({ filas: [fila('a')] as never, hayMas: true, falloAlTraerMas: true });
    expect(textos(f)).toContain('No se pudieron traer más publicaciones.');
    expect(boton(f, 'Reintentar')).toHaveLength(1);
  });
});
