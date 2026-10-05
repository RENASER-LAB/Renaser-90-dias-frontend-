/**
 * `LogoDeMarca` (2026-10-05): los logos de svgl como componentes de `react-native-svg`.
 *
 * Además de lo que se ve (marca conocida, desconocida, modo oscuro, lector de pantalla), se prueba la
 * conversión del SVG, que es donde un logo se rompe sin que nadie lo note en la web:
 * - las posiciones de los `<Stop>` son NÚMEROS: en Android e iOS `react-native-svg` lee `".231"`
 *   como 0 (su expresión exige un dígito adelante) y el degradado de Google salía de un solo color;
 * - todo `url(#…)` apunta a un id definido en el MISMO logo, y los ids llevan el prefijo de la marca
 *   (en la web son de toda la página).
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import { ClipPath, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

let mockModoDelTema: 'light' | 'dark' = 'light';
jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({
      mode: mockModoDelTema,
      c: mockModoDelTema === 'light' ? tokens.light : tokens.dark,
      t: tokens.type,
      space: tokens.space,
      toggle: () => undefined,
      setMode: () => undefined,
    }),
  };
});

import { LogoDeMarca, esMarcaConLogo, type MarcaConLogo } from '../LogoDeMarca';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MARCAS: MarcaConLogo[] = ['google', 'apple', 'googleMeet', 'zoom', 'googleDrive'];

function dibujar(props: React.ComponentProps<typeof LogoDeMarca>): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(LogoDeMarca, props));
  });
  return raiz;
}

/** Cuántos nodos nativos quedaron en pantalla. */
const nodosDibujados = (raiz: ReactTestRenderer) => raiz.root.findAll(n => typeof n.type === 'string').length;

const deTipo = (raiz: ReactTestRenderer, tipo: unknown) => raiz.root.findAll(n => n.type === tipo);

/** El nodo que lleva la accesibilidad del logo (la caja que envuelve al `Svg`). */
function caja(raiz: ReactTestRenderer): ReactTestInstance {
  return raiz.root.findAll(n => typeof n.type === 'string' && n.props.style !== undefined)[0];
}

describe('LogoDeMarca', () => {
  it('dibuja una marca conocida, con su nombre para el lector de pantalla', () => {
    const raiz = dibujar({ marca: 'googleMeet', size: 24 });
    const nodo = caja(raiz);
    expect(nodo.props.accessibilityLabel).toBe('Google Meet');
    expect(nodo.props.accessibilityRole).toBe('image');
    expect(nodo.props.accessible).toBe(true);
    expect(StyleSheet.flatten(nodo.props.style)).toEqual({ width: 24, height: 24 });
    expect(deTipo(raiz, Path).length).toBeGreaterThan(0);
  });

  it('una marca que no está en la lista no dibuja nada (y no revienta)', () => {
    expect(nodosDibujados(dibujar({ marca: 'tiktok' as MarcaConLogo }))).toBe(0);
    // Ni siquiera un nombre heredado de `Object` («constructor», «toString») cuenta como marca.
    expect(nodosDibujados(dibujar({ marca: 'constructor' as MarcaConLogo }))).toBe(0);
    expect(nodosDibujados(dibujar({ marca: 'zoom' }))).toBeGreaterThan(0);
    expect(esMarcaConLogo('toString')).toBe(false);
    expect(esMarcaConLogo('zoom')).toBe(true);
  });

  it('Apple sigue al tema: negro en claro, blanco en oscuro (las dos variantes de svgl)', () => {
    mockModoDelTema = 'light';
    expect(deTipo(dibujar({ marca: 'apple' }), Path)[0].props.fill).toBe('#000');
    mockModoDelTema = 'dark';
    expect(deTipo(dibujar({ marca: 'apple' }), Path)[0].props.fill).toBe('#fff');
    mockModoDelTema = 'light';
  });

  it('`modo` le gana al tema', () => {
    mockModoDelTema = 'light';
    expect(deTipo(dibujar({ marca: 'apple', modo: 'dark' }), Path)[0].props.fill).toBe('#fff');
    mockModoDelTema = 'dark';
    expect(deTipo(dibujar({ marca: 'apple', modo: 'light' }), Path)[0].props.fill).toBe('#000');
    mockModoDelTema = 'light';
  });

  it('los logos a color no cambian con el tema', () => {
    const colores = (modo: 'light' | 'dark') =>
      deTipo(dibujar({ marca: 'googleDrive', modo }), Path).map(p => p.props.fill);
    expect(colores('dark')).toEqual(colores('light'));
  });

  it('decorativo: queda fuera del lector de pantalla (el nombre ya está escrito al lado)', () => {
    const nodo = caja(dibujar({ marca: 'google', decorativo: true }));
    expect(nodo.props['aria-hidden']).toBe(true);
    expect(nodo.props.accessibilityLabel).toBeUndefined();
  });

  it('el tamaño por defecto es 20, como `Icon`', () => {
    expect(StyleSheet.flatten(caja(dibujar({ marca: 'zoom' })).props.style)).toEqual({ width: 20, height: 20 });
  });
});

describe('LogoDeMarca: la conversión desde svgl', () => {
  it.each(MARCAS)('%s: las posiciones de los degradados son números entre 0 y 1, en orden', marca => {
    const raiz = dibujar({ marca });
    for (const degradado of [...deTipo(raiz, LinearGradient), ...deTipo(raiz, RadialGradient)]) {
      const posiciones = degradado.findAll(n => n.type === Stop).map(s => s.props.offset as unknown);
      expect(posiciones.length).toBeGreaterThan(0);
      for (const p of posiciones) {
        expect(typeof p).toBe('number');
        expect(p as number).toBeGreaterThanOrEqual(0);
        expect(p as number).toBeLessThanOrEqual(1);
      }
      expect([...(posiciones as number[])].sort((a, b) => a - b)).toEqual(posiciones);
    }
  });

  it.each(MARCAS)('%s: cada url(#…) apunta a un id del mismo logo, con prefijo propio', marca => {
    const raiz = dibujar({ marca });
    const definidos = [...deTipo(raiz, LinearGradient), ...deTipo(raiz, RadialGradient), ...deTipo(raiz, ClipPath)].map(
      n => n.props.id as string
    );
    for (const id of definidos) expect(id).toMatch(/^logo[A-Z][A-Za-z]+-/);
    const usados = raiz.root
      .findAll(n => typeof n.type !== 'string')
      .flatMap(n => [n.props.fill, n.props.clipPath])
      .filter((v): v is string => typeof v === 'string' && v.startsWith('url('))
      .map(v => /^url\(#(.+)\)$/.exec(v)?.[1]);
    for (const id of usados) expect(definidos).toContain(id);
  });

  it('Google: la «G» con degradado de svgl, sus ocho degradados y su recorte', () => {
    const raiz = dibujar({ marca: 'google' });
    expect(deTipo(raiz, LinearGradient)).toHaveLength(1);
    expect(deTipo(raiz, RadialGradient)).toHaveLength(7);
    expect(deTipo(raiz, ClipPath)).toHaveLength(1);
  });

  it('dos marcas distintas no comparten ids (en la web conviven en la misma página)', () => {
    const ids = MARCAS.flatMap(marca => {
      const raiz = dibujar({ marca });
      return [...deTipo(raiz, LinearGradient), ...deTipo(raiz, RadialGradient), ...deTipo(raiz, ClipPath)].map(
        n => n.props.id as string
      );
    });
    expect(new Set(ids).size).toBe(ids.length);
  });
});
