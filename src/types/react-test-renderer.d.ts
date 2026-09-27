/**
 * Tipos mínimos de `react-test-renderer`, solo lo que usan las pruebas de hooks
 * (`features/training/hooks/__tests__`, `features/community/hooks/__tests__`).
 *
 * El paquete llega con `jest-expo` y no trae tipos propios; `@types/react-test-renderer` no está
 * instalado. Se declaran acá las tres piezas que se usan en vez de sumar una dependencia para
 * pruebas: montar, actualizar y desmontar un componente, y `act`.
 */
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestRenderer {
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
