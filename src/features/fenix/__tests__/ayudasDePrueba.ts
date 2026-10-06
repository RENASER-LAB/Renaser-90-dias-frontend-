/**
 * Ayudas de las pruebas del fénix: el doble de `rive-react-native` (jest.setup.js) guarda el ref de cada vista Rive
 * montada; acá se simulan sus eventos (`PHOENIX_READY`, `PHOENIX_ACTION_COMPLETE`) y se lee lo que recibió.
 */
import { jest } from '@jest/globals';
import type React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

type Llamadas = { mock: { calls: unknown[][] }; mockClear: () => void };
type RefDeRive = { fireState: Llamadas; setInputState: Llamadas };

export function ultimaVistaRive(): RefDeRive {
  const { __instancias } = jest.requireMock<{ __instancias: RefDeRive[] }>('rive-react-native');
  return __instancias[__instancias.length - 1];
}

export function vistasRive(raiz: ReactTestRenderer): ReactTestInstance[] {
  return raiz.root.findAll(n => n.props.testID === 'rive-del-fenix' && typeof n.type !== 'string' && n.props.onRiveEventReceived);
}

export function emitir(vista: ReactTestInstance, nombre: string): void {
  vista.props.onRiveEventReceived({ name: nombre });
}

/** Los valores que el `.riv` recibió para un input, en orden. */
export function valoresDe(ref: RefDeRive, input: string): unknown[] {
  return ref.setInputState.mock.calls.filter(c => c[1] === input).map(c => c[2]);
}

export function disparos(ref: RefDeRive): unknown[] {
  return ref.fireState.mock.calls.map(c => c[1]);
}

/**
 * Lo que una prueba dibuja se desmonta SIEMPRE, también si una aserción falla a mitad (E-570: un Director vivo deja
 * timers y Jest no termina). Cada archivo llama a `desmontarTodo` en `afterEach`.
 */
const montados: ReactTestRenderer[] = [];

export function crear(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  montados.push(raiz);
  return raiz;
}

export function desmontarTodo(): void {
  for (const raiz of montados.splice(0)) act(() => raiz.unmount());
}
