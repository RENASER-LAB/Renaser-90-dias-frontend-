/**
 * Formas del contrato HTTP del Código Renaser (`/api/v1/radar`).
 *
 * **Los nombres van en inglés y NO se traducen.** Es el contrato del backend viejo, tomado
 * literal (decisión RD-1 del módulo `habits`): la app de Supabase hablaba `snake_case` porque así
 * expone PostgREST las columnas, pero el contrato HTTP real siempre fue `camelCase`. Si acá se
 * "corrigiera" a español o a `snake_case`, el POST devolvería 400 por campos faltantes.
 */

/** Cuerpo de `POST /api/v1/radar`. Los cinco campos son obligatorios en el servidor. */
export interface CheckInRadarApi {
  whatAmIDoing: string;
  whatAmIThinking: string;
  whatAmIFeeling: string;
  /** 1..10. */
  energyLevel: number;
  whatAmIAvoiding: string;
}

/** Respuesta de `POST /api/v1/radar` y cada ítem de `/history`. */
export interface RegistroRadarApi extends CheckInRadarApi {
  id: string;
  /** ISO-8601 con zona (`Instant` de Java). */
  createdAt: string;
}

/** `GET /api/v1/radar/latest` — sólo el instante, o `null` si nunca respondió. */
export interface UltimoRadarApi {
  createdAt: string | null;
}

/** `GET /api/v1/radar/history` — páginas de 20, descendente. */
export interface HistorialRadarApi {
  entries: RegistroRadarApi[];
  /** Instante para pedir la página siguiente; `null` cuando no hay más. */
  nextCursor: string | null;
}
