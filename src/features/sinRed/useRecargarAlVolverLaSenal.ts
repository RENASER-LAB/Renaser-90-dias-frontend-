import { useEffect, useRef } from 'react';

import { alVolverLaConexion } from './estadoDeConexion';

/**
 * Spec 048 (FR-005): una lectura que falló sin señal se pide de nuevo sola cuando vuelve la señal. Solo si hay un error que
 * corregir (`hayError`): con datos en pantalla nunca los pisa ni los vacía.
 */
export function useRecargarAlVolverLaSenal(recargar: () => unknown, hayError: boolean): void {
  const ultima = useRef(recargar);
  ultima.current = recargar;
  useEffect(() => {
    if (!hayError) return;
    return alVolverLaConexion(() => void ultima.current());
  }, [hayError]);
}
