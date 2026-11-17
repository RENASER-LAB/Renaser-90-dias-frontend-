import { useEffect, useState } from 'react';

import { marcarAvisoLeido, obtenerAvisosDeAcompanamiento } from '../api/avisosApi';
import { avisoVigenteDe } from '../utils/motivoDeLaFila';

/**
 * Al abrir la ficha de un aprendiz, sus avisos de acompañamiento sin leer quedan como leídos (spec 055 FR-009, SC-007): el mentor ya
 * está mirando a esa persona, y un aviso que sigue «sin leer» después de abrir su ficha es ruido. Se marcan con el
 * `PUT /api/v1/notifications/{id}/read` que ya existe, los avisos cuya `route` lleva a ESE aprendiz; los de los demás no se tocan.
 *
 * Devuelve el texto del aviso vigente más reciente (el motivo de la cabecera «Día N · motivo»), tomado ANTES de marcarlos: leerlos
 * no borra la razón por la que el mentor entró. Si la bandeja no responde, no pasa nada: es un complemento, no la ficha.
 */
export function useAvisosDelAprendiz(aprendizId: string | null): { motivoDelAviso: string | null } {
  const [motivoDelAviso, setMotivoDelAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aprendizId) return;
    let vigente = true;
    void (async () => {
      try {
        const avisos = await obtenerAvisosDeAcompanamiento();
        if (!vigente) return;
        const delAprendiz = avisos.filter(a => a.readAt === null && avisoVigenteDe(aprendizId, [a]) !== null);
        setMotivoDelAviso(avisoVigenteDe(aprendizId, avisos)?.body.trim() || null);
        /* Uno por uno y sin esperar al otro: si uno falla, los demás igual quedan leídos. */
        await Promise.allSettled(delAprendiz.map(a => marcarAvisoLeido(a.id)));
      } catch {
        /* La bandeja es complementaria. */
      }
    })();
    return () => {
      vigente = false;
    };
  }, [aprendizId]);

  return { motivoDelAviso };
}
