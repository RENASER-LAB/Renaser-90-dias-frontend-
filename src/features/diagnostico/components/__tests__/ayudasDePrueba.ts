import React from 'react';
import { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/** Lo que comparten las pruebas del recorrido: leer textos y tocar controles como lo haría la pantalla. */

export const vaciar = () => new Promise<void>(res => setImmediate(res));

export function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

/** El primer nodo con esa etiqueta accesible que sea tocable (o editable). */
export function nodoDe(r: ReactTestRenderer, etiqueta: string | RegExp): ReactTestInstance {
  const coincide = (e: unknown) => (typeof e === 'string' ? (typeof etiqueta === 'string' ? e === etiqueta : etiqueta.test(e)) : false);
  const nodo = r.root.findAll(
    n => coincide(n.props.accessibilityLabel) && (typeof n.props.onPress === 'function' || typeof n.props.onChangeText === 'function'),
  )[0];
  if (!nodo) throw new Error(`No hay un control «${String(etiqueta)}»`);
  return nodo;
}

export async function tocar(r: ReactTestRenderer, etiqueta: string | RegExp) {
  await act(async () => {
    nodoDe(r, etiqueta).props.onPress();
    await vaciar();
  });
}

export async function escribir(r: ReactTestRenderer, etiqueta: string | RegExp, texto: string) {
  await act(async () => {
    nodoDe(r, etiqueta).props.onChangeText(texto);
    await vaciar();
  });
}

/** El botón principal (`GoldButton`) por su rótulo. */
export function botonDe(r: ReactTestRenderer, label: string): ReactTestInstance {
  const nodo = r.root.findAll(n => n.props.label === label && typeof n.props.onPress === 'function')[0];
  if (!nodo) throw new Error(`No hay un botón «${label}»`);
  return nodo;
}

export async function pulsar(r: ReactTestRenderer, label: string) {
  await act(async () => {
    botonDe(r, label).props.onPress();
    await vaciar();
  });
}

export const hayBoton = (r: ReactTestRenderer, label: string) =>
  r.root.findAll(n => n.props.label === label && typeof n.props.onPress === 'function').length > 0;

export function marcada(r: ReactTestRenderer, etiqueta: string): boolean | undefined {
  const nodo = nodoDe(r, etiqueta);
  const estado = nodo.props.accessibilityState as { selected?: boolean; checked?: boolean } | undefined;
  return estado?.selected ?? estado?.checked;
}

/** El «Paso 3 de 12, …» que lee el lector de pantalla de la barra, o null en la portada y el cierre. */
export function pasoQueSeVe(r: ReactTestRenderer): string | null {
  const barra = r.root.findAll(n => n.props.accessibilityRole === 'progressbar')[0];
  return barra ? (barra.props.accessibilityLabel as string) : null;
}
