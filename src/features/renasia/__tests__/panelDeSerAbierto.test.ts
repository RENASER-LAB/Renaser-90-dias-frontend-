/**
 * «El panel de SER está abierto» (issue #50): la señal que usa la guía de arranque para no montarse encima del chat.
 * Cuenta paneles (el panel vive en tres sitios), no se pisa con un desmontaje doble y la marca el propio panel.
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import {
  hayPanelDeSerAbierto,
  marcarPanelDeSerAbierto,
  olvidarPanelesDeSer,
  useHayPanelDeSerAbierto,
  useMarcarPanelDeSerAbierto,
} from '../state/panelDeSerAbierto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  olvidarPanelesDeSer();
});

describe('el contador de paneles abiertos', () => {
  it('abierto mientras haya uno; dos paneles no se pisan', () => {
    expect(hayPanelDeSerAbierto()).toBe(false);
    const quitarA = marcarPanelDeSerAbierto();
    const quitarB = marcarPanelDeSerAbierto();
    expect(hayPanelDeSerAbierto()).toBe(true);
    quitarA();
    expect(hayPanelDeSerAbierto()).toBe(true);
    quitarB();
    expect(hayPanelDeSerAbierto()).toBe(false);
  });

  it('quitar la misma marca dos veces no resta la de otro panel', () => {
    const quitarA = marcarPanelDeSerAbierto();
    const quitarB = marcarPanelDeSerAbierto();
    quitarA();
    quitarA();
    expect(hayPanelDeSerAbierto()).toBe(true);
    quitarB();
    expect(hayPanelDeSerAbierto()).toBe(false);
  });

  it('avisa a quien escucha en cada cambio y deja de avisar al desuscribirse', () => {
    const lecturas: boolean[] = [];
    function Oyente() {
      lecturas.push(useHayPanelDeSerAbierto());
      return null;
    }
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(React.createElement(Oyente));
    });
    expect(lecturas.at(-1)).toBe(false);
    let quitar!: () => void;
    act(() => {
      quitar = marcarPanelDeSerAbierto();
    });
    expect(lecturas.at(-1)).toBe(true);
    act(() => quitar());
    expect(lecturas.at(-1)).toBe(false);
    act(() => raiz.unmount());
  });
});

describe('el panel se anota mientras está abierto', () => {
  function Panel({ abierto }: { abierto: boolean }) {
    useMarcarPanelDeSerAbierto(abierto);
    return null;
  }

  it('abre y cierra con `visible`, y se quita al desmontarse', () => {
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(React.createElement(Panel, { abierto: false }));
    });
    expect(hayPanelDeSerAbierto()).toBe(false);
    act(() => raiz.update(React.createElement(Panel, { abierto: true })));
    expect(hayPanelDeSerAbierto()).toBe(true);
    act(() => raiz.update(React.createElement(Panel, { abierto: false })));
    expect(hayPanelDeSerAbierto()).toBe(false);
    act(() => raiz.update(React.createElement(Panel, { abierto: true })));
    act(() => raiz.unmount());
    expect(hayPanelDeSerAbierto()).toBe(false);
  });
});

describe('el panel de SER lo usa', () => {
  const panel = fs.readFileSync(path.resolve(__dirname, '../screens/RenasiaPanel.tsx'), 'utf8');

  it('lo marca solo cuando el Modal de verdad se muestra (abierto y SER disponible)', () => {
    expect(panel).toMatch(/useMarcarPanelDeSerAbierto\(visible && serDisponible\);/);
    // Y antes del `return null` de «no visible»: los hooks no pueden quedar detrás de un retorno anticipado.
    expect(panel.indexOf('useMarcarPanelDeSerAbierto(visible')).toBeLessThan(panel.indexOf('if (!visible) return null;'));
  });
});
