/**
 * El encabezado de Comunidad que se esconde con la barra (2026-10-02): el hook, con el proveedor de
 * verdad y el `onScroll` encadenado como lo usa `ComunidadScreen`. Reanimated es el doble de
 * `jest.setup.js` (`withTiming` llega al instante): se prueba a dónde va, no la animación.
 *
 * Contra el código anterior falla entera (el hook no existía); el caso de «cambiar de pestaña con
 * la barra ya a la vista» falla además contra el `mostrar()` anterior del proveedor, que no avisaba
 * si la barra no cambiaba.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Keyboard } from 'react-native';

import { BarraInferiorProvider, useBarraInferior, useOcultarBarraAlDesplazar, type BarraInferior } from '../BarraInferior';
import { useEncabezadoAlDesplazar } from '../useEncabezadoAlDesplazar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Encabezado = ReturnType<typeof useEncabezadoAlDesplazar>;
let barra: BarraInferior | null = null;
let encabezado: Encabezado | null = null;
let onScroll: ((e: never) => void) | null = null;

function Pantalla({ vista = 'muro', conFila = true, disponible = true }: { vista?: string; conFila?: boolean; disponible?: boolean }) {
  barra = useBarraInferior();
  encabezado = useEncabezadoAlDesplazar({ disponible, conFila });
  onScroll = useOcultarBarraAlDesplazar({ vista, onScroll: encabezado.alDesplazar }).onScroll as never;
  return null;
}

const evento = (y: number) =>
  ({ nativeEvent: { contentOffset: { x: 0, y }, contentSize: { width: 400, height: 3000 }, layoutMeasurement: { width: 400, height: 600 } } }) as never;
const layout = (y: number, height: number) => ({ nativeEvent: { layout: { x: 0, y, width: 400, height } } }) as never;

/** Encabezado de 200: título hasta 56, bloque de secciones desde 56 y la fila a 40 dentro de él. */
const ALTO = 200;
const SOBRE_LA_FILA = 56 + 40 - 6;

async function montar(props: React.ComponentProps<typeof Pantalla> = {}): Promise<ReactTestRenderer> {
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(BarraInferiorProvider, null, React.createElement(Pantalla, props)));
  });
  barra!.altoQueGana.value = 70;
  act(() => {
    encabezado!.medir.encabezado(layout(0, ALTO));
    encabezado!.medir.bloqueDeSecciones(layout(56, 144));
    encabezado!.medir.fila(layout(40, 90));
  });
  return raiz;
}

const desplazar = (...ys: number[]) => act(() => ys.forEach(y => onScroll!(evento(y))));
const subio = () => encabezado!.desplazamiento.value;

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  (Keyboard as unknown as { isVisible: () => boolean }).isVisible = () => false;
});
afterEach(() => {
  jest.restoreAllMocks();
  barra = encabezado = onScroll = null;
});

describe('useEncabezadoAlDesplazar', () => {
  it('una vez medido flota y cada lista lleva su alto de relleno arriba', async () => {
    await montar();
    expect(encabezado!.flotante).toBe(true);
    expect(encabezado!.relleno).toBe(ALTO);
  });

  it('al bajar se esconde entero junto con la barra; al subir un poco vuelven solo los círculos; arriba, completo', async () => {
    await montar();
    desplazar(0, 100, 200, 300);
    expect(barra!.escondida.value).toBe(1);
    expect(subio()).toBe(-ALTO);

    desplazar(290, 280, 270);
    expect(barra!.escondida.value).toBe(0);
    expect(subio()).toBe(-SOBRE_LA_FILA);

    desplazar(150, 60, 10);
    expect(subio()).toBe(0);
  });

  it('al empezar a bajar desde el tope no pasa por «solo círculos»', async () => {
    await montar();
    desplazar(0, 20, 26);
    expect(barra!.escondida.value).toBe(0);
    expect(subio()).toBe(0);
  });

  it('al cambiar de sección vuelve completo', async () => {
    const raiz = await montar({ vista: 'muro' });
    desplazar(0, 100, 200, 300, 290, 280, 270);
    expect(subio()).toBe(-SOBRE_LA_FILA);
    await act(async () => {
      raiz.update(React.createElement(BarraInferiorProvider, null, React.createElement(Pantalla, { vista: 'tribu' })));
    });
    expect(subio()).toBe(0);
  });

  it('al cambiar de pestaña (un «mostrar» con la barra ya a la vista) vuelve completo', async () => {
    await montar();
    desplazar(0, 100, 200, 300, 290, 280, 270);
    expect(barra!.escondida.value).toBe(0);
    expect(subio()).toBe(-SOBRE_LA_FILA);
    act(() => barra!.mostrar());
    expect(subio()).toBe(0);
  });

  it('sin fila de secciones (lección), subir un poco no deja medio encabezado', async () => {
    await montar({ conFila: false });
    desplazar(0, 100, 200, 300, 290, 280, 270);
    expect(subio()).toBe(-ALTO);
  });

  it('con «Reducir movimiento» va en el flujo, fijo, como antes', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await montar();
    expect(encabezado!.flotante).toBe(false);
    expect(encabezado!.relleno).toBe(0);
    desplazar(0, 100, 200, 300);
    expect(subio()).toBe(0);
  });

  it('con lector de pantalla va en el flujo, fijo', async () => {
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
    await montar();
    expect(encabezado!.flotante).toBe(false);
    desplazar(0, 100, 200, 300);
    expect(subio()).toBe(0);
  });

  it('en la conversación abierta (no disponible) no flota', async () => {
    await montar({ disponible: false });
    expect(encabezado!.flotante).toBe(false);
    expect(encabezado!.relleno).toBe(0);
  });

  it('sin proveedor no flota ni rompe', () => {
    act(() => {
      TestRenderer.create(React.createElement(Pantalla));
    });
    expect(encabezado!.flotante).toBe(false);
    expect(() => onScroll!(evento(500))).not.toThrow();
  });
});
