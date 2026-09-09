import { useEffect, useState } from 'react';

import { almacenMapa } from '../almacen';
import { consultarMapa } from '../api/mapaApi';
import type { EstadoMapa } from '../tipos';

/**
 * Solo el ESTADO del mapa (para la tarjeta de Home): no iniciado, en progreso, listo o activo.
 * Se relee cada vez que el flujo se cierra (`refresco` cambia), que es cuando pudo cambiar.
 *
 * Consulta el servidor ademas del borrador local, y por el mismo motivo que el flujo: el estado
 * local se pierde al reinstalar o al cambiar de telefono, y entonces esta tarjeta invitaba a
 * "disenar tu mapa" a alguien que ya lo habia terminado. El servidor solo puede CONFIRMAR que
 * esta hecho, nunca desmarcarlo.
 */
export function useEstadoMapa(userId: string | null, refresco: boolean): EstadoMapa | null {
  const [estado, setEstado] = useState<EstadoMapa | null>(null);
  useEffect(() => {
    if (!userId) {
      setEstado(null);
      return;
    }
    let vigente = true;
    (async () => {
      const mapa = await almacenMapa.leer(userId);
      if (!vigente) return;
      const local = mapa?.estado ?? 'no_iniciado';
      setEstado(local);
      if (local === 'activo') return;
      try {
        const servidor = await consultarMapa();
        if (vigente && servidor.stageCompleted) setEstado('activo');
      } catch {
        // Sin red se queda el estado local; la tarjeta sigue siendo utilizable.
      }
    })();
    return () => {
      vigente = false;
    };
  }, [userId, refresco]);
  return estado;
}
