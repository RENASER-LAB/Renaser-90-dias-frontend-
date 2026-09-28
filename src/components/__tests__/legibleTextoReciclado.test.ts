import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * E-419: «Ya la recibí» salía cortado «Ya la» en Android cuando la pantalla ya abierta pasaba a «En
 * camino». Con Fabric, los `TextView` se reciclan sin que se les borre el padding, y al montar un
 * `Text` nuevo su padding solo viaja si es distinto de cero: un texto SIN padding heredaba el de la
 * vista reciclada (una pastilla, un chip) y se partía en dos renglones con el segundo recortado.
 *
 * Esto no se puede dibujar en jest; lo que sí se puede exigir es la condición que lo evita: TODO
 * texto de `Legible` lleva padding horizontal distinto de cero, así que el padding siempre se manda
 * al montar y pisa el que haya quedado. Con el código anterior (sin padding) estas pruebas fallan.
 */

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import { BotonPeligro, BotonPrincipal, BotonSecundario, SeccionPlegable, TituloDeSeccion } from '../Legible';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(elemento: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(elemento);
  });
  return r;
}

/** El padding izquierdo y derecho efectivos de cada `Text` que se dibuja. */
function paddingsDeLosTextos(r: ReactTestRenderer): { texto: string; izquierda: number; derecha: number }[] {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => {
      const estilo = (StyleSheet.flatten(n.props.style) ?? {}) as Record<string, unknown>;
      const lado = (clave: 'paddingLeft' | 'paddingRight') =>
        Number(estilo[clave] ?? estilo.paddingHorizontal ?? estilo.padding ?? 0);
      return {
        texto: React.Children.toArray(n.props.children).join(''),
        izquierda: lado('paddingLeft'),
        derecha: lado('paddingRight'),
      };
    });
}

describe('los textos de Legible no heredan el padding de una vista reciclada (E-419)', () => {
  it.each([
    ['BotonPrincipal', BotonPrincipal],
    ['BotonSecundario', BotonSecundario],
    ['BotonPeligro', BotonPeligro],
  ])('la etiqueta de %s lleva padding horizontal, también con ícono', (_nombre, Boton) => {
    const r = montar(React.createElement(Boton, { etiqueta: 'Ya la recibí', icono: 'check', onPress: () => undefined }));
    const textos = paddingsDeLosTextos(r).filter(t => t.texto === 'Ya la recibí');
    expect(textos).toHaveLength(1);
    expect(textos[0].izquierda).toBeGreaterThan(0);
    expect(textos[0].derecha).toBeGreaterThan(0);
  });

  it('el título, su detalle y la sección plegable también', () => {
    const r = montar(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(TituloDeSeccion, { detalle: 'Una línea' }, 'Historial'),
        React.createElement(SeccionPlegable, { titulo: 'Semana', detalle: 'Lunes a domingo' }, null),
      ),
    );
    const textos = paddingsDeLosTextos(r);
    expect(textos.map(t => t.texto)).toEqual(['Historial', 'Una línea', 'Semana', 'Lunes a domingo']);
    for (const t of textos) {
      expect({ texto: t.texto, conPadding: t.izquierda > 0 && t.derecha > 0 }).toEqual({ texto: t.texto, conPadding: true });
    }
  });

  it('el padding no cambia el resto de la etiqueta: 17 px, centrada, puede achicarse', () => {
    const r = montar(React.createElement(BotonPrincipal, { etiqueta: 'Guardar', onPress: () => undefined }));
    const etiqueta = r.root.findAll(n => (n.type as unknown) === 'Text')[0];
    expect(StyleSheet.flatten(etiqueta.props.style)).toMatchObject({ fontSize: 17, textAlign: 'center', flexShrink: 1 });
  });
});
