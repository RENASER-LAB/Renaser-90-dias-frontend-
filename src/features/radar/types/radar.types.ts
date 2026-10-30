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
  /**
   * La hora en punto a la que respondía (spec 012), 0..23. La calcula el servidor con los horarios que había al
   * registrar. Falta en los registros anteriores, en los hechos fuera de una hora elegida y con un backend anterior.
   */
  horaPrevista?: number | null;
}

/**
 * Las horas propias de UN día de la semana (spec 012, cuarta ronda). `dia` es ISO: lunes = 1 … domingo = 7. `horas: []`
 * es «Sin Radar ese día» (no suena nada y no se registra). Un día que no está en `dias` sigue las horas de todos los días.
 */
export interface DiaDeMiRadarApi {
  dia: number;
  horas: number[];
}

/**
 * `GET/PUT /api/v1/radar/mi-radar` (spec 012). Apagado: `{ encendido: false, horas: [], dias: [] }`.
 *
 * `horas` valen para todos los días; `dias` son los que tienen horas propias. **`dias` es opcional al construir** (un
 * pedido, una prueba): ausente, ningún día tiene horas propias. Lo que sale de `radarSchemas.miRadar` siempre lo trae.
 */
export interface MiRadarApi {
  encendido: boolean;
  /** Horas en punto de todos los días, de 3 a 23, ordenadas. Vacía si está apagado. */
  horas: number[];
  /** Los días con horas propias (o sin Radar), ordenados por día. */
  dias?: DiaDeMiRadarApi[];
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
  /** Si la persona tiene Mi Radar encendido y a qué horas (spec 012). Ausente en un backend anterior. */
  miRadar?: MiRadarApi | null;
}
