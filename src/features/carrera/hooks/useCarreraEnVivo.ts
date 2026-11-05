import { useEffect, useState, useSyncExternalStore } from 'react';

import { carreraActual, preferenciasActuales, suscribirCarrera } from '../servicios/carreraEnVivo';
import { estadoDelEnvio, suscribirEnvios, versionDeLosEnvios } from '../servicios/colaDeCarreras';
import type { EstadoDeLaCarrera, PreferenciasDeLaCarrera } from '../types/carrera.types';
import type { EstadoDelEnvio } from '../utils/textosDeLaCarrera';

/** La carrera en curso (o `null`), para React. Se vuelve a dibujar con cada punto, paso o latido. */
export function useCarreraEnVivo(): EstadoDeLaCarrera | null {
  return useSyncExternalStore(suscribirCarrera, carreraActual, carreraActual);
}

export function usePreferenciasDeLaCarrera(): PreferenciasDeLaCarrera {
  return useSyncExternalStore(suscribirCarrera, preferenciasActuales, preferenciasActuales);
}

/** El estado del envío de una carrera (la línea del hábito en «Terminaste»). */
export function useEstadoDelEnvio(carreraId: string | null): EstadoDelEnvio | null {
  useSyncExternalStore(suscribirEnvios, versionDeLosEnvios, versionDeLosEnvios);
  return carreraId ? estadoDelEnvio(carreraId) : null;
}

/** La hora, cada segundo, mientras `activo`: el tiempo grande corre aunque el GPS no mande puntos. */
export function useRelojDeLaCarrera(activo: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activo) return;
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activo]);
  return ahora;
}
