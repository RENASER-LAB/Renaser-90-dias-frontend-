/**
 * #216 (2026-11-16, primer build de iOS): en iPhone el podio de la Tabla se veía roto. El 2.º puesto desaparecía y el 1.º
 * quedaba cortado por su mitad vertical. Las columnas laterales giraban ±10° en el eje vertical y el escenario se
 * balanceaba ±2.5° (`rotateY`, con `perspective`). En iOS, Core Animation corta las capas giradas en 3D contra el plano de
 * sus vecinas (el fondo y el foco del escenario), y la mitad que se va hacia atrás queda oculta. Android no hace ese corte.
 *
 * El arreglo: en iOS el giro vertical es 0. Se quedan la subida, las tapas (`rotateX`, que iOS dibuja bien), la corona,
 * el foco y las chispas. Contra el código anterior falla la prueba de iOS: había `rotateY` de 10° y un balanceo animado.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet } from 'react-native';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import { PodioRanking } from '../PodioRanking';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Estilo = { transform?: Array<Record<string, unknown>> };

/** Todos los `rotateY` de los transforms dibujados: los fijos como texto y los animados como «animado». */
function girosVerticales(raiz: ReactTestRenderer): string[] {
  const giros: string[] = [];
  for (const n of raiz.root.findAll(() => true)) {
    const estilo = StyleSheet.flatten(n.props?.style) as Estilo | undefined;
    for (const t of estilo?.transform ?? []) {
      if (!('rotateY' in t)) continue;
      const v = t.rotateY;
      giros.push(typeof v === 'string' || typeof v === 'number' ? String(v) : 'animado');
    }
  }
  return giros;
}

function montarEn(os: 'ios' | 'android'): ReactTestRenderer {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  let raiz!: ReactTestRenderer;
  try {
    act(() => {
      raiz = TestRenderer.create(
        React.createElement(PodioRanking, {
          top1: { name: 'Ana', score: '80 Pts' },
          top2: { name: 'Beto', score: '70 Pts' },
          top3: { name: 'Caro', score: '60 Pts' },
          activo: false,
        })
      );
    });
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
  }
  return raiz;
}

describe('el podio en iPhone (#216)', () => {
  let raiz: ReactTestRenderer | null = null;
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
  });

  it('en iOS nada gira en el eje vertical: ni las columnas ni el balanceo del escenario', () => {
    raiz = montarEn('ios');
    const giros = girosVerticales(raiz);
    expect(giros.length).toBeGreaterThan(0);
    expect(giros.every(g => g === '0deg' || g === '0')).toBe(true);
  });

  it('en Android se queda el escenario de siempre: columnas laterales giradas y balanceo', () => {
    raiz = montarEn('android');
    const giros = girosVerticales(raiz);
    expect(giros).toContain('10deg');
    expect(giros).toContain('-10deg');
    expect(giros).toContain('animado');
  });
});
