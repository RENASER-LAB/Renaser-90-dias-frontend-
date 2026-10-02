/**
 * El hook y el proveedor de «ocultar la barra al desplazar» (2026-10-02): que una lista la esconda
 * y la devuelva, y los casos en que NO debe moverse (lector de pantalla, reducir movimiento,
 * teclado abierto) o debe volver sola (cambio de sub-vista, salir de una sub-pantalla).
 *
 * Reanimated es el doble oficial (`jest.setup.js`): `withTiming` llega al destino al instante, así
 * que acá se prueba la decisión, no la animación.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Keyboard } from 'react-native';

import { BarraInferiorProvider, useBarraInferior, useOcultarBarraAlDesplazar, type BarraInferior } from '../BarraInferior';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let barra: BarraInferior | null = null;
let onScroll: ((e: never) => void) | null = null;

function Lista({ vista }: { vista?: string }) {
  barra = useBarraInferior();
  onScroll = useOcultarBarraAlDesplazar({ vista }).onScroll as never;
  return null;
}

function evento(y: number) {
  return { nativeEvent: { contentOffset: { x: 0, y }, contentSize: { width: 400, height: 3000 }, layoutMeasurement: { width: 400, height: 600 } } } as never;
}

async function montar(hijos: React.ReactElement): Promise<ReactTestRenderer> {
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(BarraInferiorProvider, null, hijos));
  });
  barra!.altoQueGana.value = 70;
  return raiz;
}

function desplazar(...ys: number[]) {
  act(() => ys.forEach(y => onScroll!(evento(y))));
}

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  (Keyboard as unknown as { isVisible: () => boolean }).isVisible = () => false;
});
afterEach(() => {
  jest.restoreAllMocks();
  barra = null;
  onScroll = null;
});

describe('useOcultarBarraAlDesplazar', () => {
  it('al bajar la esconde y al subir la devuelve', async () => {
    await montar(React.createElement(Lista));
    desplazar(0, 100, 200, 300);
    expect(barra!.escondida.value).toBe(1);
    desplazar(290, 280, 270);
    expect(barra!.escondida.value).toBe(0);
  });

  it('con lector de pantalla queda fija a la vista', async () => {
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
    await montar(React.createElement(Lista));
    expect(barra!.fija).toBe(true);
    desplazar(0, 100, 200, 300);
    expect(barra!.escondida.value).toBe(0);
  });

  it('con «Reducir movimiento» queda fija a la vista', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await montar(React.createElement(Lista));
    desplazar(0, 100, 200, 300);
    expect(barra!.escondida.value).toBe(0);
  });

  it('con el teclado abierto no la toca', async () => {
    (Keyboard as unknown as { isVisible: () => boolean }).isVisible = () => true;
    await montar(React.createElement(Lista));
    desplazar(0, 100, 200, 300);
    expect(barra!.escondida.value).toBe(0);
  });

  it('al cambiar de sub-vista vuelve a la vista', async () => {
    const raiz = await montar(React.createElement(Lista, { vista: 'main' }));
    desplazar(0, 100, 200, 300);
    expect(barra!.escondida.value).toBe(1);
    await act(async () => {
      raiz.update(React.createElement(BarraInferiorProvider, null, React.createElement(Lista, { vista: 'hub' })));
    });
    expect(barra!.escondida.value).toBe(0);
  });

  it('al salir de una sub-pantalla que la escondió, vuelve', async () => {
    let barraDeAfuera: BarraInferior | null = null;
    function Afuera({ conLista }: { conLista: boolean }) {
      barraDeAfuera = useBarraInferior();
      return conLista ? React.createElement(Lista) : null;
    }
    const raiz = await montar(React.createElement(Afuera, { conLista: true }));
    desplazar(0, 100, 200, 300);
    expect(barraDeAfuera!.escondida.value).toBe(1);
    await act(async () => {
      raiz.update(React.createElement(BarraInferiorProvider, null, React.createElement(Afuera, { conLista: false })));
    });
    expect(barraDeAfuera!.escondida.value).toBe(0);
  });

  it('después de un «mostrar» forzado, un desplazamiento chico no la vuelve a esconder', async () => {
    await montar(React.createElement(Lista));
    desplazar(0, 100, 200, 300);
    act(() => barra!.mostrar());
    expect(barra!.escondida.value).toBe(0);
    desplazar(303);
    expect(barra!.escondida.value).toBe(0);
  });

  it('llama primero al onScroll propio de la lista', async () => {
    const propio = jest.fn();
    function ListaConPropio() {
      barra = useBarraInferior();
      onScroll = useOcultarBarraAlDesplazar({ onScroll: propio }).onScroll as never;
      return null;
    }
    await montar(React.createElement(ListaConPropio));
    desplazar(50);
    expect(propio).toHaveBeenCalledTimes(1);
  });

  it('sin proveedor no hace nada ni rompe', () => {
    let props: ReturnType<typeof useOcultarBarraAlDesplazar> | null = null;
    function Suelta() {
      props = useOcultarBarraAlDesplazar();
      return null;
    }
    act(() => {
      TestRenderer.create(React.createElement(Suelta));
    });
    expect(() => props!.onScroll(evento(500))).not.toThrow();
    expect(props!.scrollEventThrottle).toBe(16);
  });
});
