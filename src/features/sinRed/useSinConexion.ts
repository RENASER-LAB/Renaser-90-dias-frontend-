import { useEffect, useState } from 'react';

import { sinConexionDesdeMs, suscribirConexion } from './estadoDeConexion';

/** Spec 048: `true` mientras la app está sin señal (el mismo estado que el ícono y `SoloConConexion`). */
export function useSinConexion(): boolean {
  const [sinRed, setSinRed] = useState(sinConexionDesdeMs() !== null);
  useEffect(() => suscribirConexion(() => setSinRed(sinConexionDesdeMs() !== null)), []);
  return sinRed;
}
