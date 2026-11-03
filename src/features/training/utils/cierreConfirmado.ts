/**
 * Lo que la lista de Training refleja EN EL ACTO de un cierre que el SERVIDOR ya confirmó, antes de que llegue la relectura que trae el estado
 * verdadero (V-2, 26/09/2026). No inventa nada: `puntosOtorgados` es lo que el servidor respondió al cerrar (`/complete` de un hábito o el
 * `POST /rocks/{id}/evidence` de una acción), y solo se pone si vino. Sin esto, el resumen «1 de 23 hechos · 0 pts» se quedaba en 0 hasta que
 * llegaba la relectura, aunque el servidor ya hubiera pagado (issue #115, 6).
 */
export interface CierreReflejable {
  done: boolean;
  hasEvidence: boolean;
  estado?: string;
  puntosOtorgados?: number | null;
}

export function conElCierreConfirmado<T extends CierreReflejable>(habito: T, conEvidencia: boolean, puntosOtorgados?: number | null): T {
  return {
    ...habito,
    done: true,
    estado: 'COMPLETADO',
    hasEvidence: habito.hasEvidence || conEvidencia,
    ...(typeof puntosOtorgados === 'number' && Number.isFinite(puntosOtorgados) ? { puntosOtorgados } : {}),
  };
}
