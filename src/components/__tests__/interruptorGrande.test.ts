/**
 * El interruptor grande de «Cómo suena» (spec 009): una fila entera que se toca, para personas de 40 años en
 * adelante. Rol de interruptor con su estado (incluido «Varía»), medidas del pedido del dueño, un solo «tic» por
 * cambio y movimiento del pulgar de 180 ms que con «reducir movimiento» no existe.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

const mockMovimiento = { reducir: false };
const mockConTiempo = jest.fn((destino: number, _config?: unknown) => destino);

jest.mock('react-native-reanimated', () => {
  const doble = require('react-native-reanimated/mock');
  const { useRef } = require('react');
  return {
    ...doble,
    useReducedMotion: () => mockMovimiento.reducir,
    withTiming: (destino: number, config?: unknown) => mockConTiempo(destino, config),
    useSharedValue: (inicial: unknown) => {
      const ref = useRef(null);
      if (ref.current === null) ref.current = doble.useSharedValue(inicial);
      return ref.current;
    },
  };
});
jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));

import { tacto } from '../../utils/tacto';
import {
  ALTO_MINIMO_DE_LA_FILA,
  ALTO_RIEL_GRANDE,
  ANCHO_RIEL_GRANDE,
  InterruptorGrande,
  posicionDelPulgar,
  PULGAR_GRANDE,
  RECORRIDO_DEL_PULGAR_GRANDE,
  valorTrasElToque,
} from '../InterruptorGrande';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Props = React.ComponentProps<typeof InterruptorGrande>;

function dibujar(props: Partial<Props> = {}) {
  const onCambiar = jest.fn<(v: boolean) => void>();
  const propios: Props = {
    etiqueta: 'Vibración',
    descripcion: 'El teléfono vibra',
    valor: false,
    onCambiar,
    ...props,
  };
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(InterruptorGrande, propios));
  });
  return { raiz, onCambiar, propios };
}

const fila = (raiz: ReactTestRenderer): ReactTestInstance =>
  raiz.root.findAll(n => n.props.accessibilityRole === 'switch' && typeof n.props.onPress === 'function')[0];

const estiloDe = (nodo: ReactTestInstance) => StyleSheet.flatten(nodo.props.style) as Record<string, unknown>;

const textos = (raiz: ReactTestRenderer) =>
  raiz.root.findAll(n => (n.type as unknown) === Text || (n.type as { displayName?: string })?.displayName === 'Text')
    .flatMap(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string')) as string[];

beforeEach(() => {
  mockMovimiento.reducir = false;
  mockConTiempo.mockClear();
});

describe('el interruptor grande se anuncia como un interruptor', () => {
  it('rol switch, el rótulo como nombre, la explicación como ayuda y su estado', () => {
    const { raiz } = dibujar({ valor: true });
    const f = fila(raiz);
    expect(f.props.accessibilityLabel).toBe('Vibración');
    expect(f.props.accessibilityHint).toBe('El teléfono vibra');
    expect(f.props.accessibilityState).toEqual({ checked: true, disabled: false });
    // La web solo lee `aria-checked` (react-native-web 0.21).
    expect(f.props['aria-checked']).toBe(true);
    expect(fila(dibujar({ valor: false }).raiz).props.accessibilityState).toEqual({ checked: false, disabled: false });
  });

  it('«Varía»: estado mixto, con la palabra a la vista y dicha para el lector', () => {
    const { raiz } = dibujar({ valor: 'varia' });
    const f = fila(raiz);
    expect(f.props.accessibilityState).toEqual({ checked: 'mixed', disabled: false });
    expect(f.props['aria-checked']).toBe('mixed');
    expect(f.props.accessibilityValue).toEqual({ text: 'Varía según el día' });
    expect(textos(raiz)).toContain('Varía');
    // Sin «Varía» no hay ninguna palabra de más.
    expect(textos(dibujar({ valor: true }).raiz)).not.toContain('Varía');
  });

  it('el estado también se lee en el riel: «Sí» y «No», y el nombre de la fila no los repite', () => {
    const { raiz } = dibujar({ valor: true });
    expect(textos(raiz)).toEqual(expect.arrayContaining(['Vibración', 'El teléfono vibra', 'Sí', 'No']));
    const escondidos = raiz.root.findAll(n => n.props.accessibilityElementsHidden === true);
    expect(escondidos.length).toBeGreaterThanOrEqual(2);
  });

  it('deshabilitado no se puede tocar y lo dice', () => {
    const { raiz, onCambiar } = dibujar({ deshabilitado: true });
    const f = fila(raiz);
    expect(f.props.disabled).toBe(true);
    expect(f.props.accessibilityState).toEqual({ checked: false, disabled: true });
    expect(onCambiar).not.toHaveBeenCalled();
  });
});

describe('al tocarlo', () => {
  it('apagado pide encendido; encendido pide apagado; «Varía» pide encendido para todos', () => {
    expect(valorTrasElToque(false)).toBe(true);
    expect(valorTrasElToque(true)).toBe(false);
    expect(valorTrasElToque('varia')).toBe(true);

    for (const [valor, esperado] of [[false, true], [true, false], ['varia', true]] as const) {
      const { raiz, onCambiar } = dibujar({ valor });
      act(() => fila(raiz).props.onPress());
      expect(onCambiar).toHaveBeenCalledWith(esperado);
    }
  });

  it('da UN «tic» por cambio, en el mismo toque', () => {
    const { raiz } = dibujar();
    (tacto.seleccion as jest.Mock).mockClear();
    act(() => fila(raiz).props.onPress());
    expect(tacto.seleccion).toHaveBeenCalledTimes(1);
  });
});

describe('las medidas del pedido del dueño', () => {
  it('riel de 72 × 40, pulgar blanco de 34 y la fila de 56 o más', () => {
    expect([ANCHO_RIEL_GRANDE, ALTO_RIEL_GRANDE, PULGAR_GRANDE, ALTO_MINIMO_DE_LA_FILA]).toEqual([72, 40, 34, 56]);
    // El pulgar viaja lo que sobra del riel: 72 − 34 − 2 × 3 márgenes.
    expect(RECORRIDO_DEL_PULGAR_GRANDE).toBe(32);

    const { raiz } = dibujar({ valor: true });
    const dibujos = raiz.root.findAll(n => typeof n.props.style !== 'undefined' && !Array.isArray(n.type));
    const medidas = dibujos.map(estiloDe);
    expect(medidas.some(e => e.width === 72 && e.height === 40 && e.borderRadius === 20)).toBe(true);
    expect(medidas.some(e => e.width === 34 && e.height === 34 && e.shadowOpacity !== undefined)).toBe(true);
    expect(medidas.some(e => (e.minHeight as number) >= 56)).toBe(true);
  });

  it('el rótulo va a 17 px y la explicación a 15 o más', () => {
    const { raiz } = dibujar();
    const tamano = (texto: string) => {
      const n = raiz.root.findAll(x => React.Children.toArray(x.props.children).includes(texto) && x.props.style)[0];
      return estiloDe(n).fontSize;
    };
    expect(tamano('Vibración')).toBe(17);
    expect(tamano('El teléfono vibra')).toBeGreaterThanOrEqual(15);
  });

  it('el toque es toda la fila: la fila ocupa el ancho', () => {
    const { raiz } = dibujar();
    expect(StyleSheet.flatten(fila(raiz).props.contenedorStyle).width).toBe('100%');
  });
});

describe('la posición del pulgar', () => {
  it('apagado a la izquierda, encendido a la derecha, «Varía» en el medio', () => {
    expect(posicionDelPulgar(false)).toBe(0);
    expect(posicionDelPulgar(true)).toBe(1);
    expect(posicionDelPulgar('varia')).toBe(0.5);
  });
});

describe('el movimiento', () => {
  it('el pulgar se desplaza en 180 ms con la curva de la pantalla', () => {
    const { raiz, propios } = dibujar({ valor: false });
    mockConTiempo.mockClear();
    act(() => raiz.update(React.createElement(InterruptorGrande, { ...propios, valor: true })));
    expect(mockConTiempo).toHaveBeenCalled();
    for (const [, config] of mockConTiempo.mock.calls) {
      expect(config).toMatchObject({ duration: 180 });
    }
    // El destino del pulgar es el extremo derecho.
    expect(mockConTiempo.mock.calls.map(([destino]) => destino)).toContain(1);
  });

  it('con «reducir movimiento» el cambio es instantáneo: no se anima nada', () => {
    mockMovimiento.reducir = true;
    const { raiz, propios } = dibujar({ valor: false });
    mockConTiempo.mockClear();
    act(() => raiz.update(React.createElement(InterruptorGrande, { ...propios, valor: true })));
    act(() => raiz.update(React.createElement(InterruptorGrande, { ...propios, valor: 'varia' })));
    expect(mockConTiempo).not.toHaveBeenCalled();
    // Y el estado se entiende igual.
    expect(fila(raiz).props.accessibilityState.checked).toBe('mixed');
  });
});
