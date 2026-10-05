/**
 * «El Método Renaser» en páginas que se deslizan con el dedo (rediseño de Yo, 2026-10-05). Antes:
 * una tarjeta que «giraba» con el `Animated` de React Native, flechas, y puntos de 8 px tocables.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import { MetodoEnPaginas, paginaEn, type FaseDelMetodo } from '../MetodoEnPaginas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FASES: FaseDelMetodo[] = [1, 2, 3, 4].map(numero => ({
  numero,
  titulo: `Fase de prueba ${numero}`,
  rango: `Días ${numero}–${numero + 1}`,
  icono: 'eye',
  frase: 'Una frase.',
  resumen: 'Un resumen.',
  puntos: ['Un punto'],
}));

function dibujar(): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(MetodoEnPaginas, { fases: FASES, margenLateral: 24 }));
  });
  // El ancho llega con el primer `onLayout`: un teléfono de 412.
  const [medidor] = raiz.root.findAll((n: ReactTestInstance) => typeof n.props.onLayout === 'function');
  act(() => medidor.props.onLayout({ nativeEvent: { layout: { width: 412, height: 600, x: 0, y: 0 } } }));
  return raiz;
}

describe('el método en páginas', () => {
  it('engancha página por página y redondea a la más cercana', () => {
    expect(paginaEn(0, 376, 4)).toBe(0);
    expect(paginaEn(187, 376, 4)).toBe(0);
    expect(paginaEn(189, 376, 4)).toBe(1);
    expect(paginaEn(376 * 3, 376, 4)).toBe(3);
    expect(paginaEn(99999, 376, 4)).toBe(3);
    expect(paginaEn(-50, 376, 4)).toBe(0);
    expect(paginaEn(10, 0, 4)).toBe(0);
  });

  it('muestra las cuatro fases en una lista horizontal que engancha, con asomo de la siguiente', () => {
    const raiz = dibujar();
    const [lista] = raiz.root.findAll(n => n.props.horizontal === true && n.props.snapToInterval !== undefined);
    // 412 − 2 × 24 = 364 de página, más 12 de separación.
    expect(lista.props.snapToInterval).toBe(376);
    expect(lista.props.decelerationRate).toBe('fast');
    const titulos = raiz.root.findAll(n => n.type === Text && n.props.accessibilityRole === 'header').map(n => n.props.children);
    expect(titulos).toEqual(FASES.map(f => f.titulo));
  });

  it('los puntos no se tocan: son un indicador, y para el lector de pantalla un control ajustable', () => {
    const raiz = dibujar();
    const [puntos] = raiz.root.findAll(n => n.props.accessibilityRole === 'adjustable');
    expect(puntos.props.accessibilityValue).toEqual({ text: 'Fase 1 de 4' });
    expect(puntos.props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);
    expect(puntos.findAll(n => typeof n.props.onPress === 'function')).toHaveLength(0);
  });

  it('una sola acción escrita para quien no desliza: «Siguiente fase»', () => {
    const raiz = dibujar();
    const botones = raiz.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    // `Presionable` y su `Pressable` llevan las mismas props: se cuentan los nombres, no los nodos.
    expect([...new Set(botones.map(b => b.props.accessibilityLabel))]).toEqual(['Siguiente fase']);
  });
});
