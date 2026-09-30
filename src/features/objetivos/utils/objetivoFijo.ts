import { ApiError } from '../../../services/http/apiClient';
import type { DefinicionRocaMaestra, RocaMaestraApi } from '../types/objetivos.types';

/**
 * El objetivo de 90 días queda fijo una vez definido (D-234 del backend, decisión del dueño del
 * 2026-09-30). Nace del Mapa de Renacimiento y no se cambia: lo que se ajusta son los objetivos
 * semanales y las acciones diarias. Lo único que la persona sigue moviendo es cuánto lleva.
 *
 * El backend responde `409` con `codigo: "ROCA_MAESTRA_FIJA"` a cualquier cambio del objetivo, la
 * meta, la unidad o el punto de partida. Por eso, con la roca ya definida, **se manda lo fijo tal
 * cual lo devolvió el servidor** y solo el avance es de la persona.
 *
 * > **El agujero que esto cierra.** El modal prellenaba "PARTISTE DE" con el avance cuando la roca
 * > era de las viejas sin punto de partida (antes de V43). Con la roca fija, ese prellenado habría
 * > rebotado como un cambio y la persona no habría podido ni anotar su avance (E-462 del backend).
 */
export const CODIGO_ROCA_MAESTRA_FIJA = 'ROCA_MAESTRA_FIJA';

/** Una línea, la que se muestra en el modal cuando el objetivo ya está definido. */
export const LINEA_OBJETIVO_FIJO = 'Tu objetivo de 90 días quedó fijo en tu Mapa. Aquí solo anotas cuánto llevas.';

/** `true` cuando el servidor rechazó el cambio porque el objetivo de 90 días ya está fijo. */
export function esRocaMaestraFija(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  const cuerpo = error.body as { codigo?: unknown } | null | undefined;
  return cuerpo?.codigo === CODIGO_ROCA_MAESTRA_FIJA;
}

export type AvanceParaGuardar =
  | { ok: true; definicion: DefinicionRocaMaestra }
  | { ok: false; titulo: string; mensaje: string };

/**
 * La definición que se manda al anotar el avance de un objetivo ya definido: lo fijo, idéntico a lo
 * guardado (un `null` sigue ausente, no se inventa), y el avance nuevo.
 */
export function definicionConAvance(roca: RocaMaestraApi, avanceEscrito: string): AvanceParaGuardar {
  if (roca.meta == null || roca.unidad == null) {
    return { ok: false, titulo: 'Sin avance que anotar', mensaje: 'Tu objetivo no se mide con un número.' };
  }
  const limpio = avanceEscrito.trim().replace(',', '.');
  const avance = Number(limpio);
  if (limpio === '' || !Number.isFinite(avance) || avance < 0) {
    return { ok: false, titulo: 'Avance inválido', mensaje: 'Escribe cuánto llevas: un número, no negativo.' };
  }
  return {
    ok: true,
    definicion: {
      objetivo: roca.objetivo,
      meta: roca.meta,
      avance,
      unidad: roca.unidad,
      lineaBase: roca.lineaBase ?? undefined,
    },
  };
}
