import { useEffect, useState } from 'react';

import { almacenMapa } from '../almacen';
import { consultarMapa } from '../api/mapaApi';
import type { EstadoMapa } from '../tipos';

/**
 * Lo que se sabe del Mapa: su estado y si ese estado ya está CONFIRMADO.
 *
 * `confirmado` es verdad cuando el borrador del teléfono dice «activo» o cuando el servidor respondió. Mientras el
 * servidor no contesta (o si la red falla) el estado es solo el del teléfono y puede estar atrasado: un teléfono nuevo
 * dice «no iniciado» de alguien que ya terminó su Mapa. Quien tenga que AFIRMAR «todavía no hizo su Mapa» (la tarjeta de
 * acciones de Hoy, 2026-10-31) espera a `confirmado`; la tarjeta del Mapa, que solo cambia un título, sigue con `estado`.
 */
export interface LecturaDelEstadoDelMapa {
  estado: EstadoMapa | null;
  confirmado: boolean;
}

const SIN_LECTURA: LecturaDelEstadoDelMapa = { estado: null, confirmado: false };

/**
 * El ESTADO del mapa (para la tarjeta de Home) y si ya está confirmado: no iniciado, en progreso, listo o activo.
 * Se relee cada vez que el flujo se cierra (`refresco` cambia), que es cuando pudo cambiar.
 *
 * Consulta el servidor ademas del borrador local, y por el mismo motivo que el flujo: el estado
 * local se pierde al reinstalar o al cambiar de telefono, y entonces esta tarjeta invitaba a
 * "disenar tu mapa" a alguien que ya lo habia terminado. El servidor solo puede CONFIRMAR que
 * esta hecho, nunca desmarcarlo.
 */
export function useLecturaDelEstadoDelMapa(userId: string | null, refresco: boolean): LecturaDelEstadoDelMapa {
  const [lectura, setLectura] = useState<LecturaDelEstadoDelMapa>(SIN_LECTURA);
  useEffect(() => {
    if (!userId) {
      setLectura(SIN_LECTURA);
      return;
    }
    let vigente = true;
    (async () => {
      const mapa = await almacenMapa.leer(userId);
      if (!vigente) return;
      const local = mapa?.estado ?? 'no_iniciado';
      setLectura(previa => ({ estado: local, confirmado: local === 'activo' || (previa.confirmado && previa.estado === local) }));
      if (local === 'activo') return;
      try {
        const servidor = await consultarMapa();
        if (vigente) setLectura({ estado: servidor.stageCompleted ? 'activo' : local, confirmado: true });
      } catch {
        // Sin red se queda el estado local; la tarjeta sigue siendo utilizable.
      }
    })();
    return () => {
      vigente = false;
    };
  }, [userId, refresco]);
  return lectura;
}

/** Solo el ESTADO del mapa, sin saber si está confirmado (la tarjeta del Mapa de Hoy). */
export function useEstadoMapa(userId: string | null, refresco: boolean): EstadoMapa | null {
  return useLecturaDelEstadoDelMapa(userId, refresco).estado;
}
