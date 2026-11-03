/**
 * El día elegido del calendario de Eventos es un círculo de 40, como el de hoy (E2E del 03/11, issue #115): en Android un `View` con solo
 * `backgroundColor` y `borderRadius` salía como un cuadrado de esquinas casi vivas, y el de hoy —con borde— sí salía redondo. El elegido va
 * ahora con un borde del mismo color y `overflow: 'hidden'`.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import { light } from '../../../../theme/tokens';
import { CalendarioDelMes } from '../CalendarioDelMes';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

const estilo = (e: unknown) => (StyleSheet.flatten(e as never) ?? {}) as Record<string, unknown>;

function dibujar(diaElegido: string | null): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(CalendarioDelMes, {
        mes: { anio: 2026, mes: 10 },
        hoyIso: '2026-10-05',
        porDia: {},
        diaElegido,
        zona: 'America/Lima',
        cargando: false,
        fallo: false,
        onCambiarMes: () => undefined,
        onHoy: () => undefined,
        onElegirDia: () => undefined,
        onReintentar: () => undefined,
        onAbrir: () => undefined,
      }),
    );
  });
  return raiz as unknown as ReactTestRenderer;
}

/** El círculo del día: la `View` de 40 × 40 que hay dentro de la celda cuyo nombre empieza con `rotulo`. */
function circuloDe(r: ReactTestRenderer, rotulo: string): Record<string, unknown> {
  const celda = r.root.findAll(n => n.props.accessibilityRole === 'button' && String(n.props.accessibilityLabel ?? '').startsWith(rotulo))[0];
  const vistas = celda.findAll((n: ReactTestInstance) => n.type === 'View' && estilo(n.props.style).width === 40 && estilo(n.props.style).height === 40);
  expect(vistas.length).toBeGreaterThan(0);
  return estilo(vistas[0].props.style);
}

describe('el día elegido del calendario', () => {
  it('un día que no es hoy se dibuja como un círculo de 40: radio 20, borde del mismo color y recorte', () => {
    const r = dibujar('2026-10-09');
    const elegido = circuloDe(r, 'Viernes 9');
    expect(elegido).toMatchObject({ width: 40, height: 40, borderRadius: 20, backgroundColor: light.gold, borderColor: light.gold, overflow: 'hidden' });
    expect(elegido.borderWidth).toBeGreaterThan(0);
  });

  it('hoy sigue con su borde dorado, y un día sin elegir no lleva fondo', () => {
    const r = dibujar('2026-10-09');
    const hoy = circuloDe(r, 'Hoy, Lunes 5');
    expect(hoy).toMatchObject({ borderRadius: 20, borderColor: light.gold, overflow: 'hidden' });
    expect(hoy.backgroundColor).toBeUndefined();
    const otro = circuloDe(r, 'Martes 6');
    expect(otro.backgroundColor).toBeUndefined();
  });

  it('hoy elegido también es un círculo lleno', () => {
    const r = dibujar('2026-10-05');
    expect(circuloDe(r, 'Hoy, Lunes 5')).toMatchObject({ borderRadius: 20, backgroundColor: light.gold, borderColor: light.gold, overflow: 'hidden' });
  });
});
