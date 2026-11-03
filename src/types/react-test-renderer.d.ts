/**
 * Tipos mínimos de `react-test-renderer`, solo lo que usan las pruebas de hooks
 * (`features/training/hooks/__tests__`, `features/community/hooks/__tests__`) y las de las piezas
 * del chat (`features/chat/components/__tests__`, que recorren el árbol con `root.findAll`).
 *
 * El paquete llega con `jest-expo` y no trae tipos propios; `@types/react-test-renderer` no está
 * instalado. Se declaran acá las tres piezas que se usan en vez de sumar una dependencia para
 * pruebas: montar, actualizar y desmontar un componente, leer lo que dibujó (`toJSON`, `parent`), y `act`.
 */
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestInstance {
    type: unknown;
    props: Record<string, any>;
    parent: ReactTestInstance | null;
    findAll(predicado: (nodo: ReactTestInstance) => boolean): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    /** El árbol dibujado (los nodos con sus `children`); `null` si el componente no dibuja nada. */
    toJSON(): unknown;
    update(elemento: ReactElement): void;
    unmount(): void;
  }

  export function act(accion: () => void): void;
  export function act(accion: () => Promise<unknown>): Promise<void>;

  const TestRenderer: {
    create(elemento: ReactElement): ReactTestRenderer;
  };
  export default TestRenderer;
}
