import { useEffect, useState } from 'react';

import { almacenMapa } from '../almacen';
import type { EstadoMapa } from '../tipos';

/**
 * Solo el ESTADO del mapa (para la tarjeta de Home): no iniciado, en progreso, listo o activo.
 * Se relee cada vez que el flujo se cierra (`refresco` cambia), que es cuando pudo cambiar.
 */
export function useEstadoMapa(userId: string | null, refresco: boolean): EstadoMapa | null {
  const [estado, setEstado] = useState<EstadoMapa | null>(null);
  useEffect(() => {
    if (!userId) {
      setEstado(null);
      return;
    }
    let vigente = true;
    almacenMapa.leer(userId).then(mapa => {
      if (vigente) setEstado(mapa?.estado ?? 'no_iniciado');
    });
    return () => {
      vigente = false;
    };
  }, [userId, refresco]);
  return estado;
}
