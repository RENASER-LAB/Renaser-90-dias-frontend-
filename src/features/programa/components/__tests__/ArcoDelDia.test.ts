/**
 * El medidor de 90 días de PLAN se llena desde 0 hasta el día actual al entrar (pedido del dueño,
 * 2026-09-29). Lo que se fija aquí: termina exactamente en el día real, con «reducir movimiento»
 * aparece el final directo, y un día nuevo vuelve a animar desde 0.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import { ArcoDelDia, DURACION_LLENADO_MS } from '../ArcoDelDia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function reducirMovimiento(activo: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(activo);
}

async function dibujar(dia: number): Promise<ReactTestRenderer> {
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(ArcoDelDia, { dia, ancho: 228, alto: 120 }));
  });
  return raiz;
}

function numero(raiz: ReactTestRenderer): string {
  const nodo = raiz.root.findAll(n => n.props.testID === 'arco-del-dia-numero')[0];
  return String(([] as unknown[]).concat(nodo.props.children).join(''));
}

function puntoDorado(raiz: ReactTestRenderer): { cx: number; cy: number } {
  const circulo = raiz.root.findAll(n => n.props.r === 6 && n.props.cx !== undefined)[0];
  return { cx: Number(circulo.props.cx), cy: Number(circulo.props.cy) };
}

async function avanzar(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('ArcoDelDia', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('arranca en 0, pasa por valores intermedios y termina exactamente en el día real', async () => {
    reducirMovimiento(false);
    const raiz = await dibujar(23);
    expect(numero(raiz)).toBe('0');

    await avanzar(DURACION_LLENADO_MS / 4);
    const intermedio = Number(numero(raiz));
    expect(intermedio).toBeGreaterThan(0);
    expect(intermedio).toBeLessThan(23);

    await avanzar(DURACION_LLENADO_MS);
    expect(numero(raiz)).toBe('23');
    // El punto dorado termina donde lo pone el día 23, no en un valor redondeado de camino.
    const esperado = 114 + 100 * Math.cos(Math.PI - (23 / 90) * Math.PI);
    expect(puntoDorado(raiz).cx).toBeCloseTo(esperado, 5);
  });

  it('con «reducir movimiento» muestra el estado final directo, sin cuadros intermedios', async () => {
    reducirMovimiento(true);
    const raiz = await dibujar(23);
    expect(numero(raiz)).toBe('23');
  });

  it('un día nuevo vuelve a animar desde 0 hasta el nuevo valor', async () => {
    reducirMovimiento(false);
    const raiz = await dibujar(23);
    await avanzar(DURACION_LLENADO_MS + 100);
    expect(numero(raiz)).toBe('23');

    await act(async () => {
      raiz.update(React.createElement(ArcoDelDia, { dia: 24, ancho: 228, alto: 120 }));
    });
    expect(Number(numero(raiz))).toBeLessThan(24);
    await avanzar(DURACION_LLENADO_MS / 4);
    expect(Number(numero(raiz))).toBeLessThan(24);
    await avanzar(DURACION_LLENADO_MS);
    expect(numero(raiz)).toBe('24');
  });

  it('un re-render con el mismo día no repite la animación', async () => {
    reducirMovimiento(false);
    const raiz = await dibujar(23);
    await avanzar(DURACION_LLENADO_MS + 100);
    await act(async () => {
      raiz.update(React.createElement(ArcoDelDia, { dia: 23, ancho: 230, alto: 121 }));
    });
    expect(numero(raiz)).toBe('23');
  });

  it('día 0 (antes del Día 1) y día 90 no se rompen', async () => {
    reducirMovimiento(false);
    const cero = await dibujar(0);
    expect(numero(cero)).toBe('0');
    expect(puntoDorado(cero).cx).toBeCloseTo(14, 5);
    expect(puntoDorado(cero).cy).toBeCloseTo(108, 5);

    const noventa = await dibujar(90);
    await avanzar(DURACION_LLENADO_MS + 100);
    expect(numero(noventa)).toBe('90');
    expect(puntoDorado(noventa).cx).toBeCloseTo(214, 5);
  });

  it('el lector de pantalla lee el valor final, no los números de la cuenta', async () => {
    reducirMovimiento(false);
    const raiz = await dibujar(23);
    const bloque = raiz.root.findAll(n => n.props.testID === 'arco-del-dia')[0];
    expect(bloque.props.accessible).toBe(true);
    expect(bloque.props.accessibilityLabel).toBe('Día 23 de 90');
  });
});
