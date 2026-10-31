import { useEffect, useRef, useState } from 'react';

import * as objetivosApi from '../api/objetivosApi';
import type { RocaDiariaApi, RocaMaestraApi, RocaSemanalApi } from '../types/objetivos.types';
import { metaDeLaAccion } from '../utils/metaDeLaAccion';

/**
 * La «Meta» de la acción que sigue hoy (tarjeta de acciones de Hoy, 2026-10-31): el objetivo de su semana o, si no hay, el de
 * 90 días. Ver `metaDeLaAccion`.
 *
 * **Pocos pedidos, a propósito.** Hoy ya lee las acciones del día (`GET /rocks/today`); esto suma, solo cuando hay una acción
 * que mostrar:
 *  - `GET /rocks/weekly` (la semana en curso) y, solo si la semana no resuelve la meta, `GET /rocks/master` (su eje y el
 *    objetivo de 90 días);
 *  - **una vez por acción** y por sesión: lo leído queda en memoria de este hook (la clave es la semana y el eje de la acción),
 *    así que volver a Hoy, deslizar para recargar o que cambie la acción que sigue DENTRO de la misma semana y eje no repite
 *    nada. Un fallo de red no se guarda: la próxima acción que se muestre lo vuelve a intentar.
 *
 * `lista` es verdad cuando ya se sabe si hay meta (o cuando no hay acción de la que preguntar): la tarjeta espera a eso para
 * dibujarse una sola vez, con su línea «Meta: …» ya puesta, en vez de crecer cuando llega.
 */
export function useMetaDeLaAccion(
  accion: Pick<RocaDiariaApi, 'id' | 'eje' | 'rocaSemanalId'> | null,
): { meta: string | null; lista: boolean } {
  const memoria = useRef(new Map<string, string | null>());
  const clave = accion ? `${accion.rocaSemanalId ?? '-'}|${accion.eje}` : null;
  const [leida, setLeida] = useState<{ clave: string; meta: string | null } | null>(null);

  const eje = accion?.eje;
  const rocaSemanalId = accion?.rocaSemanalId ?? null;
  useEffect(() => {
    if (clave === null || eje === undefined) return;
    if (memoria.current.has(clave)) {
      setLeida({ clave, meta: memoria.current.get(clave) ?? null });
      return;
    }
    let vigente = true;
    void (async () => {
      const dato = { eje, rocaSemanalId };
      let semanales: RocaSemanalApi[] = [];
      let maestras: RocaMaestraApi[] = [];
      let algunaLectura = false;
      try {
        semanales = await objetivosApi.obtenerRocasSemanales();
        algunaLectura = true;
      } catch {
        // Sin semana se intenta con el objetivo de 90 días.
      }
      let meta = metaDeLaAccion(dato, semanales, maestras);
      // La semana enlazada por id lo resuelve sin más pedidos; si no, hace falta el eje y el objetivo de 90 días.
      const enlazada = rocaSemanalId !== null && semanales.some(s => s.id === rocaSemanalId && s.titulo.trim() !== '');
      if (!enlazada) {
        try {
          maestras = await objetivosApi.obtenerRocasMaestras();
          algunaLectura = true;
          meta = metaDeLaAccion(dato, semanales, maestras);
        } catch {
          // Se queda con lo que haya.
        }
      }
      if (algunaLectura) memoria.current.set(clave, meta);
      if (vigente) setLeida({ clave, meta });
    })();
    return () => {
      vigente = false;
    };
  }, [clave, eje, rocaSemanalId]);

  if (clave === null) return { meta: null, lista: true };
  return leida?.clave === clave ? { meta: leida.meta, lista: true } : { meta: null, lista: false };
}
