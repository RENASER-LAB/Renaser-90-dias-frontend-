/**
 * La pastilla `goldWash` detrás del ícono de la pestaña abierta (decisión del dueño, 2026-10-05,
 * opción 5 del mosaico `barra-iconos-opciones.png`). Antes la abierta se distinguía solo por el
 * color, y en modo claro el dorado y el gris tienen casi el mismo brillo (1,04 : 1).
 *
 * Contra el código anterior fallan todas salvo la de TRAINING (que ya no tenía pastilla): no había
 * ninguna, ni la caja del tamaño del ícono que la deja fuera del flujo.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Circle, Path, Rect } from 'react-native-svg';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}));

import { TabBar } from '../TabBar';
import { Icon } from '../Icon';
import { light } from '../../theme/tokens';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RUTAS = ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo'];
const NOMBRES = ['HOY', 'PLAN', 'TRAINING', 'COMUNIDAD', 'YO'];
const PASTILLA = 'pastilla-de-la-pestana-abierta';

function dibujar(indice: number): ReactTestRenderer {
  const routes = RUTAS.map(name => ({ key: `${name}-k`, name }));
  const props = {
    state: { index: indice, routes },
    descriptors: Object.fromEntries(routes.map(r => [r.key, { options: {} }])),
    navigation: { navigate: () => undefined },
  } as unknown as React.ComponentProps<typeof TabBar>;
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(TabBar, props));
  });
  return raiz;
}

const pestana = (raiz: ReactTestRenderer, nombre: string): ReactTestInstance =>
  raiz.root.findAll(n => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === nombre)[0];

/** Las pastillas dibujadas (solo el nodo nativo, no el componente que lo envuelve). */
const pastillas = (nodo: ReactTestInstance): ReactTestInstance[] =>
  nodo.findAll(n => n.props.testID === PASTILLA && typeof n.type === 'string');

const estilo = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) as Record<string, unknown>;

/**
 * La caja que va en el flujo, arriba del nombre: la vista nativa más cercana que envuelve al ícono
 * (`findAll` recorre de afuera hacia adentro, así que es la última que lo contiene).
 */
const cajaDelIcono = (raiz: ReactTestRenderer, nombre: string): ReactTestInstance => {
  const quienesLoEnvuelven = pestana(raiz, nombre).findAll(
    n => typeof n.type === 'string' && n.findAll(m => m.type === Icon).length > 0
  );
  return quienesLoEnvuelven[quienesLoEnvuelven.length - 1];
};

describe('la pastilla de la pestaña abierta', () => {
  it('hay una sola, y está detrás del ícono de la pestaña abierta', () => {
    for (const indice of [0, 1, 3, 4]) {
      const raiz = dibujar(indice);
      expect(pastillas(raiz.root)).toHaveLength(1);
      expect(pastillas(pestana(raiz, NOMBRES[indice]))).toHaveLength(1);
    }
  });

  it('en TRAINING no hay: su botón ya es el círculo dorado', () => {
    expect(pastillas(dibujar(2).root)).toHaveLength(0);
  });

  it('es `goldWash` y el ícono sigue de línea, sin relleno', () => {
    const raiz = dibujar(0);
    expect(estilo(pastillas(raiz.root)[0]).backgroundColor).toBe(light.goldWash);
    const trazos = [Path, Circle, Rect].flatMap(tipo => pestana(raiz, 'HOY').findAll(n => n.type === tipo));
    expect(trazos.length).toBeGreaterThan(0);
    for (const t of trazos) expect(t.props.fill).toBe('none');
  });

  it('no cambia el alto de la barra ni corre el nombre: va fuera del flujo, en una caja del tamaño del ícono', () => {
    const abierta = dibujar(0);
    const cerrada = dibujar(1);
    const pastilla = estilo(pastillas(abierta.root)[0]);
    expect(pastilla.position).toBe('absolute');
    // La caja en el flujo es la misma con pastilla o sin ella: lo que ocupa el ícono.
    const conPastilla = estilo(cajaDelIcono(abierta, 'HOY'));
    const sinPastilla = estilo(cajaDelIcono(cerrada, 'HOY'));
    expect(conPastilla).toEqual(sinPastilla);
    const lado = (pestana(abierta, 'HOY').findAll(n => n.type === Icon)[0].props as { size: number }).size;
    expect(conPastilla).toEqual({ width: lado, height: lado });
    // Y queda centrada sobre el ícono, sin tocar el nombre (a 7 px): sobresale 4 arriba y 4 abajo.
    expect(pastilla.top).toBe(-4);
    expect((pastilla.height as number) + (pastilla.top as number) - lado).toBe(4);
    expect((pastilla.left as number) * 2 + (pastilla.width as number)).toBe(lado);
  });

  it('aparece sin animación (se cambia de pestaña decenas de veces al día)', () => {
    const claves = Object.keys(estilo(pastillas(dibujar(3).root)[0]));
    expect(claves.filter(k => /^(transition|animation)/.test(k))).toEqual([]);
  });
});
