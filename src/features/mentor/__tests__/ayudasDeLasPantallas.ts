import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/** Ayudas comunes de las pruebas de las pantallas del mentor (spec 055). No es una prueba: el nombre no termina en `.test.ts`. */

export async function montar(elemento: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(elemento);
  });
  return r;
}

export function textos(r: ReactTestRenderer): string[] {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));
}

export const todoElTexto = (r: ReactTestRenderer): string => textos(r).join(' | ');

/** Lo tocable con etiqueta que no está dentro de otro tocable (el `Pressable` y su hijo animado comparten props). */
export function tocables(r: ReactTestRenderer): ReactTestInstance[] {
  const todos = r.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string');
  return todos.filter(n => !todos.includes((n as unknown as { parent: never }).parent));
}

export function etiquetas(r: ReactTestRenderer): string[] {
  return tocables(r).map(n => n.props.accessibilityLabel as string);
}

export function tocable(r: ReactTestRenderer, parte: string): ReactTestInstance {
  const nodo = tocables(r).find(n => (n.props.accessibilityLabel as string).includes(parte));
  if (!nodo) throw new Error(`No hay nada tocable que diga «${parte}». Hay: ${etiquetas(r).join(' | ')}`);
  return nodo;
}

export async function tocar(r: ReactTestRenderer, parte: string): Promise<void> {
  const nodo = tocable(r, parte);
  await act(async () => {
    nodo.props.onPress();
  });
}

export const hayTocable = (r: ReactTestRenderer, parte: string): boolean => tocables(r).some(n => (n.props.accessibilityLabel as string).includes(parte));

/** El alto del toque: el mayor `height` o `minHeight` de lo que dibuja ese tocable (y de su contenedor). */
export function altoDelToque(nodo: ReactTestInstance): number {
  const estilos = [nodo, ...nodo.findAll(() => true)].map(n => StyleSheet.flatten(n.props.style) as { height?: number; minHeight?: number } | undefined);
  return Math.max(0, ...estilos.map(e => Math.max(Number(e?.height ?? 0), Number(e?.minHeight ?? 0))));
}

export const estiloDe = (nodo: ReactTestInstance) => (StyleSheet.flatten(nodo.props.style) ?? {}) as Record<string, unknown>;

/** Los nodos de verdad (los que se dibujan) con ese `testID`: sin sus envoltorios, que repiten las mismas props. */
export const porTestID = (r: ReactTestRenderer, id: string | RegExp): ReactTestInstance[] =>
  r.root.findAll(n => typeof n.type === 'string' && typeof n.props.testID === 'string' && (typeof id === 'string' ? n.props.testID === id : id.test(n.props.testID)));

/** Los nodos de un componente por su tipo (`findAllByType` no está en los tipos de `react-test-renderer`). */
export const porTipo = (r: ReactTestRenderer, tipo: unknown): ReactTestInstance[] => r.root.findAll(n => (n.type as unknown) === tipo);
