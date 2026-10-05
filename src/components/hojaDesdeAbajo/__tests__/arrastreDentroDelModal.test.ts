import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La hoja desde abajo tiene que poder arrastrarse con el dedo DENTRO del `Modal` de React Native
 * (e2e en el emulador, 2026-10-05).
 *
 * Lo que se rompió: la cabecera sólo pedía el gesto al moverse 6 px (`onMoveShouldSetPanResponder`).
 * Pero el `Modal` de React Native envuelve su contenido en una vista que reclama el toque al empezar
 * si nadie lo hizo antes, y como esa vista es antecesora de la cabecera, el sistema de respuesta ya
 * no le pregunta a la cabecera en cada movimiento. En Android la hoja no seguía al dedo: ni volvía
 * ni se cerraba al bajarla. En la web no pasaba (react-native-web no tiene ese contenedor), por eso
 * no lo vio la prueba en el navegador.
 *
 * Contra el código de antes estas pruebas fallan: la cabecera devolvía `false` al apoyar el dedo, y
 * un toque que llegaba a soltarse durante la entrada se leía como «la bajaron un cuarto» y cerraba.
 */

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'dark', c: tokens.dark, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { HojaDesdeAbajo } from '../HojaDesdeAbajo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

function montarAbierta(alCerrar: () => void): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(HojaDesdeAbajo, {
        visible: true,
        alCerrar,
        titulo: 'Fecha de nacimiento',
        children: React.createElement(Text, null, 'ruedas'),
      }),
    );
  });
  return raiz!;
}

/** La cabecera es la vista que lleva los manejadores del arrastre. */
function cabecera(r: ReactTestRenderer): ReactTestInstance {
  const [nodo] = r.root.findAll(
    n => typeof n.type === 'string' && typeof n.props.onMoveShouldSetResponder === 'function' && typeof n.props.onResponderRelease === 'function',
  );
  if (!nodo) throw new Error('No hay cabecera arrastrable');
  return nodo;
}

/** Un evento de toque mínimo con el historial que lee `PanResponder` (un solo dedo que viene de `desde`). */
function toque(y: number, ms: number, desde = y) {
  const dedo = {
    touchActive: true,
    startPageX: 100,
    startPageY: 0,
    startTimeStamp: 0,
    currentPageX: 100,
    currentPageY: y,
    currentTimeStamp: ms,
    previousPageX: 100,
    previousPageY: desde,
    previousTimeStamp: 0,
  };
  return {
    nativeEvent: { touches: [{}], changedTouches: [{}], pageX: 100, pageY: y, timestamp: ms },
    touchHistory: { numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: ms, touchBank: [dedo] },
  };
}

describe('Arrastrar la hoja dentro del Modal de React Native', () => {
  it('la cabecera toma el dedo al apoyarlo, antes de que lo reclame el contenedor del Modal', () => {
    const r = montarAbierta(() => undefined);
    expect(cabecera(r).props.onStartShouldSetResponder(toque(0, 0))).toBe(true);
  });

  it('un toque en la cabecera sin arrastrar no cierra la hoja, aunque llegue durante la entrada', () => {
    const alCerrar = jest.fn();
    const r = montarAbierta(alCerrar);
    const c = cabecera(r);
    act(() => {
      c.props.onResponderGrant(toque(0, 0));
      c.props.onResponderRelease(toque(0, 40));
    });
    expect(alCerrar).not.toHaveBeenCalled();
  });

  it('bajarla con el dedo la cierra', () => {
    const alCerrar = jest.fn();
    const r = montarAbierta(alCerrar);
    const c = cabecera(r);
    act(() => {
      c.props.onResponderGrant(toque(0, 0));
      c.props.onResponderMove(toque(400, 80, 0));
      c.props.onResponderRelease(toque(400, 90));
    });
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });
});
