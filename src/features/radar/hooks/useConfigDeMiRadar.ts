import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import { guardarMiRadar, obtenerMiRadar } from '../api/radarApi';
import type { MiRadarApi } from '../types/radar.types';
import { miRadarCorresponde } from '../utils/miRadar';

/**
 * Lo que la app sabe de Mi Radar de esta cuenta (spec 012).
 *
 * - `pendiente`: todavía no se leyó, o no corresponde leerlo (antes del día 8, sin sesión).
 * - `no-disponible`: el servidor no lo ofrece (404: backend anterior; 403: cuenta sin permiso o suspendida). La fila de
 *   Yo no aparece y no suena ningún aviso de Mi Radar.
 * - `fallo`: no se pudo leer (sin red, 5xx). **No se sabe**, y por eso no se toca nada de lo programado: una red caída
 *   no puede apagar los avisos de nadie.
 * - `lista`: lo guardado en la cuenta.
 */
export type LecturaDeMiRadar =
  | { estado: 'pendiente' }
  | { estado: 'no-disponible' }
  | { estado: 'fallo' }
  | { estado: 'lista'; config: MiRadarApi };

export const MI_RADAR_PENDIENTE: LecturaDeMiRadar = { estado: 'pendiente' };

/** Lo guardado, o `null` si todavía no se sabe o no hay. */
export function configDeMiRadar(lectura: LecturaDeMiRadar): MiRadarApi | null {
  return lectura.estado === 'lista' ? lectura.config : null;
}

/**
 * Lee y guarda Mi Radar de la cuenta. Lo monta `RadarProvider` (una sola lectura para toda la app: la fila de Yo, la
 * pantalla y los avisos del teléfono leen lo mismo).
 *
 * **Solo se lee desde el día 8.** Los días 1 a 7 no se pide nada: ahí el Código Renaser es el de siempre y este
 * endpoint no tiene nada que decir (FR-001).
 */
export function useConfigDeMiRadar(diaPrograma: number | null, usuarioId: string | null) {
  const corresponde = usuarioId !== null && miRadarCorresponde(diaPrograma);
  const [lectura, setLectura] = useState<LecturaDeMiRadar>(MI_RADAR_PENDIENTE);
  /** Cada vez que sube, se vuelve a leer sin vaciar lo que ya se ve. */
  const [version, setVersion] = useState(0);

  /* Todo lo que sabe este hook es de UNA persona: al cambiar de cuenta, o al salir de los días en que corresponde, se
     olvida (mismo criterio que `useRadarDelDia`). */
  useEffect(() => {
    setLectura(MI_RADAR_PENDIENTE);
  }, [usuarioId, corresponde]);

  useEffect(() => {
    if (!corresponde) return;
    let vigente = true;
    obtenerMiRadar()
      .then(config => {
        if (vigente) setLectura({ estado: 'lista', config });
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        const sinMiRadar = e instanceof ApiError && (e.status === 404 || e.status === 403);
        if (!sinMiRadar) console.warn('[Mi Radar] no se pudo leer:', e);
        // En un fallo se conserva lo último que se sabía; solo si nunca se leyó queda en `fallo`.
        setLectura(previa => (sinMiRadar ? { estado: 'no-disponible' } : previa.estado === 'lista' ? previa : { estado: 'fallo' }));
      });
    return () => {
      vigente = false;
    };
  }, [corresponde, usuarioId, version]);

  const recargar = useCallback(() => setVersion(v => v + 1), []);

  /** Guarda y deja a la vista lo que el servidor respondió. Si falla, el error llega a quien lo pidió. */
  const guardar = useCallback(async (config: MiRadarApi): Promise<MiRadarApi> => {
    const guardada = await guardarMiRadar(config);
    setLectura({ estado: 'lista', config: guardada });
    return guardada;
  }, []);

  return useMemo(() => ({ lectura, guardar, recargar }), [lectura, guardar, recargar]);
}
