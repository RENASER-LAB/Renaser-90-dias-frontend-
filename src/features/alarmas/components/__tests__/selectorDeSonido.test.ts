/**
 * Yo → Alarmas → Sonido (2026-09-27): los cuatro de siempre, y los grupos «Para alertar» y «Para
 * relajar»; cada opción se elige tocándola y se escucha con su ▶ sin elegirla.
 *
 * Contra el código anterior falla: la lista eran cuatro filas sin grupos y sin «Escuchar».
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../components/Icon', () => ({ Icon: () => null }));

import type { SonidoDeAlarma } from '../../sonidoDeAlarma';
import { SelectorDeSonido } from '../SelectorDeSonido';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function dibujar(elegido: SonidoDeAlarma, ocupado = false) {
  const elegir = jest.fn<(s: SonidoDeAlarma) => void>();
  const escuchar = jest.fn<(s: SonidoDeAlarma) => void>();
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(SelectorDeSonido, { elegido, ocupado, onElegir: elegir, onEscuchar: escuchar }));
  });
  return { raiz, elegir, escuchar };
}

/** Todo el texto visible, en orden. */
function textos(raiz: ReactTestRenderer): string[] {
  return raiz.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .filter(Boolean);
}

/** Lo que se toca: el elemento con esa etiqueta de accesibilidad y un `onPress`. */
function tocable(raiz: ReactTestRenderer, etiqueta: string): ReactTestInstance {
  const [nodo] = raiz.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function');
  if (!nodo) throw new Error(`No hay nada que tocar con la etiqueta «${etiqueta}»`);
  return nodo;
}

describe('el selector de sonido', () => {
  it('muestra los de siempre y después los dos grupos, con palabras simples', () => {
    const { raiz } = dibujar('sistema');
    const t = textos(raiz);
    const nombres = ['El del teléfono', 'Campana Renaser', 'Voz', 'Solo vibrar', 'Para alertar', 'Amanecer', 'Marimba', 'Campanas', 'Kalimba', 'Para relajar', 'Cuenco', 'Campanitas', 'Lluvia', 'Ruido marrón'];
    expect(t.filter(x => nombres.includes(x))).toEqual(nombres);
    expect(t).toContain('Suaves: empiezan bajito y suben despacio.');
  });

  it('tocar una opción la elige; su ▶ la hace sonar sin elegirla', () => {
    const { raiz, elegir, escuchar } = dibujar('sistema');
    act(() => tocable(raiz, 'Cuenco. Un cuenco tibetano que vibra largo').props.onPress());
    expect(elegir).toHaveBeenCalledWith('relajar-cuenco');
    act(() => tocable(raiz, 'Escuchar Marimba').props.onPress());
    expect(escuchar).toHaveBeenCalledWith('alertar-marimba');
    expect(elegir).toHaveBeenCalledTimes(1);
  });

  it('cada una de las 12 opciones tiene su ▶ («Solo vibrar» se prueba, no se escucha)', () => {
    const { raiz } = dibujar('sistema');
    const botones = raiz.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    expect(botones.map(b => b.props.accessibilityLabel)).toEqual([
      'Escuchar El del teléfono', 'Escuchar Campana Renaser', 'Escuchar Voz', 'Probar Solo vibrar',
      'Escuchar Amanecer', 'Escuchar Marimba', 'Escuchar Campanas', 'Escuchar Kalimba',
      'Escuchar Cuenco', 'Escuchar Campanitas', 'Escuchar Lluvia', 'Escuchar Ruido marrón',
    ]);
  });

  it('marca la elegida, y mientras guarda no deja elegir otra (pero sí escuchar)', () => {
    const { raiz } = dibujar('relajar-lluvia', true);
    const radios = raiz.root.findAll(n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    expect(radios).toHaveLength(12);
    expect(radios.filter(r => r.props.accessibilityState.checked).map(r => r.props.accessibilityLabel)).toEqual([
      'Lluvia. Lluvia suave que crece despacio',
    ]);
    expect(radios.every(r => r.props.disabled === true)).toBe(true);
    expect(tocable(raiz, 'Escuchar Lluvia').props.disabled).toBeFalsy();
  });
});
