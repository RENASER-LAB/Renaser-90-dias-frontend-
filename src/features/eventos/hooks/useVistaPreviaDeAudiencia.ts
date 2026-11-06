import { useEffect, useRef, useState } from 'react';

import { vistaPrevia } from '../api/audienciaApi';
import type { ParteDelCable } from '../types/audiencia.types';

/** Cuánto se espera después del último cambio antes de preguntar (FR-033). */
export const ESPERA_DE_LA_VISTA_PREVIA_MS = 300;

/**
 * «Llega a N personas» (spec 044, FR-033): lo cuenta el servidor, 300 ms después del último cambio. Cada pedido toma un turno y solo escribe el
 * último: una respuesta vieja nunca pisa a una nueva. Sin partes no pregunta (`null`).
 */
export function useVistaPreviaDeAudiencia(
  partes: ParteDelCable[] | null,
  formation: string | null,
): { total: number | null; contando: boolean; fallo: boolean } {
  const [estado, setEstado] = useState<{ total: number | null; contando: boolean; fallo: boolean }>({
    total: null,
    contando: false,
    fallo: false,
  });
  const turno = useRef(0);
  const clave = partes ? JSON.stringify(partes) : null;

  useEffect(() => {
    const mio = ++turno.current;
    if (!clave) {
      setEstado({ total: null, contando: false, fallo: false });
      return;
    }
    setEstado(e => ({ ...e, contando: true, fallo: false }));
    const espera = setTimeout(() => {
      vistaPrevia(JSON.parse(clave) as ParteDelCable[], formation)
        .then(r => mio === turno.current && setEstado({ total: r.total, contando: false, fallo: false }))
        .catch(() => mio === turno.current && setEstado({ total: null, contando: false, fallo: true }));
    }, ESPERA_DE_LA_VISTA_PREVIA_MS);
    return () => clearTimeout(espera);
  }, [clave, formation]);

  return estado;
}
