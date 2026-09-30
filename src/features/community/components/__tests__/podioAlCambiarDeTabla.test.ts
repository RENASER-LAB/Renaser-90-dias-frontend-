/**
 * Podio gris al volver de «Kilómetros» (reporte del dueño, APK del 29/09): en Comunidad → Ranking,
 * al pasar a la pestaña Kilómetros y volver a General, los pedestales quedaban a medio subir
 * (transparentes, bajos, inclinados) aunque el nombre y el puntaje estaban bien.
 *
 * Las columnas del podio creaban sus interpolaciones en cada render. Para React Native cada
 * interpolación nueva es un `AnimatedProps` nuevo: suelta el anterior restaurando la vista a lo que
 * JS cree que vale la animación, que con el driver nativo no es lo que se está viendo. Estas pruebas
 * fallan si un render vuelve a fabricar nodos animados nuevos.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import { PodioRanking, EntradaEscalonada, type PuestoPodio } from '../PodioRanking';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Estilo = { transformOrigin?: string; flex?: number; transform?: Array<Record<string, unknown>> };

const puesto = (name: string, score: string): PuestoPodio => ({ name, score });
const GENERAL = [puesto('Ana', '80 Pts'), puesto('Beto', '70 Pts'), puesto('Caro', '60 Pts')] as const;
const KILOMETROS = [puesto('Dani', '12,5 km'), null, null] as const;

function podio(tops: readonly (PuestoPodio | null)[]) {
  return React.createElement(PodioRanking, { top1: tops[0], top2: tops[1], top3: tops[2], activo: true });
}

/** Las tres columnas (el `Animated.View` que sube cada pedestal), en orden plata, oro, bronce. */
function columnas(raiz: ReactTestRenderer): ReactTestInstance[] {
  return raiz.root.findAll(n => {
    if (typeof n.type === 'string') return false;
    const estilo = StyleSheet.flatten(n.props.style) as Estilo | undefined;
    // Solo el componente animado: es el que recibe los nodos (los de adentro ya reciben números).
    const subida = estilo?.transform?.[1]?.translateY;
    return estilo?.transformOrigin === 'bottom' && estilo.flex === 1 && typeof subida === 'object';
  });
}

/** Los nodos animados de la subida de cada columna (translateY, rotateX, scale). */
function nodosDeSubida(raiz: ReactTestRenderer): unknown[] {
  return columnas(raiz).flatMap(col => {
    const transform = (StyleSheet.flatten(col.props.style) as Estilo).transform ?? [];
    return [transform[1]?.translateY, transform[2]?.rotateX, transform[4]?.scale];
  });
}

describe('el podio al cambiar de tabla', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('no fabrica nodos animados nuevos al volver de Kilómetros a General', () => {
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(podio(GENERAL));
    });
    const antes = nodosDeSubida(raiz);
    expect(antes).toHaveLength(9);
    expect(antes.every(nodo => nodo != null && typeof nodo === 'object')).toBe(true);

    act(() => raiz.update(podio(KILOMETROS)));
    act(() => raiz.update(podio(GENERAL)));

    const despues = nodosDeSubida(raiz);
    despues.forEach((nodo, i) => expect(nodo).toBe(antes[i]));
    // Y lo que se lee sigue siendo General.
    const textos = raiz.root.findAll(n => n.type === Text).map(n => n.props.children);
    expect(textos).toEqual(expect.arrayContaining(['Ana', 'Beto', 'Caro']));
    act(() => raiz.unmount());
  });

  it('las filas de la tabla tampoco rehacen su deslizamiento en cada render', () => {
    const fila = (indice: number) =>
      React.createElement(EntradaEscalonada, { indice, activo: true, children: React.createElement(Text, null, 'Ana') });
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(fila(0));
    });
    const deslizamiento = () => {
      const [vista] = raiz.root.findAll(n => typeof n.type !== 'string' && Array.isArray(n.props.style));
      return (StyleSheet.flatten(vista.props.style) as Estilo).transform?.[0]?.translateX;
    };
    const antes = deslizamiento();
    act(() => raiz.update(fila(3)));
    expect(deslizamiento()).toBe(antes);
    act(() => raiz.unmount());
  });

  it('Comunidad monta un podio propio por tabla', () => {
    const texto = fs.readFileSync(path.resolve(__dirname, '../../../../screens/ComunidadScreen.tsx'), 'utf-8');
    expect(texto).toMatch(/<PodioRanking\s+key=\{tipoRanking\}/);
  });
});
