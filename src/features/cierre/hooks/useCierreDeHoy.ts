import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import { obtenerCierreDelDia } from '../api/cierreApi';
import type { CierreDelDia } from '../types/cierre.types';

/**
 * Lo que Training sabe del cierre de HOY (spec 017). La fila «Cierra tu día» solo se dibuja con `listo`: mientras no se
 * sabe, o si el servidor no lo tiene, no hay fila (nada de parpadeos: un marco que se retira después es peor que no
 * mostrarlo).
 *
 * - `sin-leer`: todavía no se pidió, o se está pidiendo la primera vez de este día.
 * - `listo`: el servidor respondió; `vista` es lo que dijo.
 * - `no-disponible`: 400/403/404, o una respuesta que no es un cierre (un backend anterior a la spec 017, Soporte TI
 *   que apagó el plan, otro rol): acá no hay cierre y la fila no existe.
 * - `error`: no se pudo leer (red, 5xx). Sin fila; se vuelve a intentar la próxima vez que se active.
 */
export type LecturaDelCierreDeHoy =
  | { estado: 'sin-leer' }
  | { estado: 'listo'; vista: CierreDelDia }
  | { estado: 'no-disponible' }
  | { estado: 'error' };

const SIN_LEER: LecturaDelCierreDeHoy = { estado: 'sin-leer' };

/** ¿Este fallo significa «el servidor no tiene cierre para esta persona»? */
export function esCierreNoDisponible(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 400 || error.status === 403 || error.status === 404;
  // No es un error de red: la respuesta no tiene la forma de un cierre.
  return true;
}

/**
 * Lee `GET /rocks/day-closure` (hoy) cuando `activo` —Training a la vista y ya es la hora de la fila— y vuelve a leer
 * cada vez que se activa de nuevo (volver al foco). Cambiar de cuenta o pasar la medianoche descarta lo leído: la fila
 * de ayer no puede quedar en hoy.
 *
 * `reemplazar` deja la lectura que acaba de traer o guardar la hoja, sin otro pedido.
 */
export function useCierreDeHoy({
  cuentaId,
  hoyIso,
  activo,
  leer = obtenerCierreDelDia,
}: {
  cuentaId: string;
  hoyIso: string;
  activo: boolean;
  leer?: (fecha?: string | null) => Promise<CierreDelDia>;
}) {
  const clave = `${cuentaId}|${hoyIso}`;
  const [guardada, setGuardada] = useState<{ clave: string; lectura: LecturaDelCierreDeHoy }>({ clave, lectura: SIN_LEER });
  /** Sube con cada pedido y con cada cambio de día/cuenta: una respuesta que llega tarde no pisa lo nuevo. */
  const pedido = useRef(0);
  const claveVigente = useRef(clave);
  claveVigente.current = clave;

  const leerHoy = useCallback(async () => {
    const mio = ++pedido.current;
    const paraEstaClave = claveVigente.current;
    let lectura: LecturaDelCierreDeHoy;
    try {
      const vista = await leer(hoyIso);
      lectura = vista.fecha === hoyIso ? { estado: 'listo', vista } : { estado: 'no-disponible' };
    } catch (error) {
      lectura = esCierreNoDisponible(error) ? { estado: 'no-disponible' } : { estado: 'error' };
    }
    if (mio !== pedido.current || paraEstaClave !== claveVigente.current) return;
    setGuardada(previa => {
      // Con un fallo pasajero se conserva lo que ya se había leído en este día.
      if (lectura.estado === 'error' && previa.clave === paraEstaClave && previa.lectura.estado === 'listo') return previa;
      return { clave: paraEstaClave, lectura };
    });
  }, [hoyIso, leer]);

  useEffect(() => {
    pedido.current += 1; // lo que venía en vuelo de otro día o de otra cuenta se descarta
    if (!activo) return;
    void leerHoy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, clave]);

  const reemplazar = useCallback((vista: CierreDelDia) => {
    if (vista.fecha !== hoyIso) return;
    pedido.current += 1;
    setGuardada({ clave: claveVigente.current, lectura: { estado: 'listo', vista } });
  }, [hoyIso]);

  const lectura = guardada.clave === clave ? guardada.lectura : SIN_LEER;
  return { lectura, recargar: leerHoy, reemplazar };
}
