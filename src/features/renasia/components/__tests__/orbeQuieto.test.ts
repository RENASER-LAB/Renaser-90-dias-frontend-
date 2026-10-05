/**
 * El orbe quieto del botón de SER (2026-10-05): la cara de adelante de una esfera de puntos, como el
 * orbe de Hoy. Que se lea como esfera depende de dos cosas que se prueban acá: todos los puntos caen
 * dentro de la caja, y los de adelante (los últimos en dibujarse) son los más grandes y opacos.
 */
import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { Circle } from 'react-native-svg';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { OrbeQuieto } from '../OrbeQuieto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('OrbeQuieto', () => {
  it('dibuja una esfera de puntos dentro de su caja, de atrás hacia adelante', () => {
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(React.createElement(OrbeQuieto, { size: 32, color: '#1A1509' }));
    });
    const puntos = raiz.root.findAll(n => n.type === Circle).map(c => c.props);
    expect(puntos.length).toBeGreaterThan(30);
    for (const p of puntos) {
      expect(p.cx - p.r).toBeGreaterThanOrEqual(0);
      expect(p.cx + p.r).toBeLessThanOrEqual(100);
      expect(p.cy - p.r).toBeGreaterThanOrEqual(0);
      expect(p.cy + p.r).toBeLessThanOrEqual(100);
      expect(p.fill).toBe('#1A1509');
    }
    const radios = puntos.map(p => p.r);
    expect(radios).toEqual([...radios].sort((a, b) => a - b));
    expect(puntos[puntos.length - 1].fillOpacity).toBeGreaterThan(puntos[0].fillOpacity);
  });
});
