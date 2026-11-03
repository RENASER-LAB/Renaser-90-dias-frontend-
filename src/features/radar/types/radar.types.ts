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
  /**
   * Spec 030 (decisión 030-2): `true` si al menos una de las respuestas se dictó con el reconocimiento de voz del teléfono y
   * sigue en el texto. La app solo lo manda cuando es `true`; ausente vale `false`. El audio nunca viaja.
   */
  dictado?: boolean;
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

/** Cómo pregunta Mi Radar un día (spec 019): `AUTOMATICO` cada hora entre el Despertar y el Dormir; `PERSONALIZADO` unas veces repartidas. */
export type ModoDeMiRadar = 'AUTOMATICO' | 'PERSONALIZADO';

/** Por qué un día no tiene horario: sin él ese día no hay Radar y no se inventa uno. */
export type MotivoSinHorario = 'SIN_DESPERTAR' | 'SIN_DORMIR' | 'HORARIO_INVALIDO';

/**
 * Un día de la semana de Mi Radar, ya resuelto por el servidor con el Despertar y el Dormir de la persona (spec 019).
 * `dia` es ISO: lunes = 1 … domingo = 7.
 */
export interface DiaDeMiRadarApi {
  dia: number;
  /** La fecha de ese día en la semana que se muestra (`yyyy-MM-dd`). */
  fecha: string | null;
  modo: ModoDeMiRadar;
  /** Las veces que pregunta de verdad: 0 si ese día no tiene Radar. */
  veces: number;
  /** Las horas en punto que caben entre su Despertar y su Dormir (0 si falta alguno). */
  maximo: number;
  /** La persona lo apagó para ese día. */
  sinRadar: boolean;
  /** Hoy y lo pasado no se editan. */
  editable: boolean;
  /** `HH:mm` o `null` si no hay. */
  despertar: string | null;
  dormir: string | null;
  /** Las horas en punto en que pregunta, de 3 a 23, ordenadas. Vacía si el día no tiene Radar. */
  horas: number[];
  motivo: MotivoSinHorario | null;
}

/**
 * `GET/PUT /api/v1/radar/mi-radar` (spec 019): encendido y los siete días de la semana. En el historial y en las fichas
 * `dias` trae solo el de hoy. **`horasDelDia(config, diaIso)` (`utils/miRadar.ts`) es la única que dice qué horas tiene un día.**
 */
export interface MiRadarApi {
  encendido: boolean;
  /** La fecha de hoy en la zona de la persona (`yyyy-MM-dd`), según el servidor. */
  hoy: string | null;
  dias: DiaDeMiRadarApi[];
}

/** Lo que se toca de un día: lo que no viene se queda como estaba (el guardado es «solo lo tocado»). */
export interface CambioDeDiaApi {
  dia: number;
  modo?: ModoDeMiRadar;
  /** De 1 a 21; solo cuenta en `PERSONALIZADO`. */
  veces?: number;
  sinRadar?: boolean;
}

/** Cuerpo de `PUT /api/v1/radar/mi-radar`. */
export interface PedidoDeMiRadarApi {
  encendido: boolean;
  dias?: CambioDeDiaApi[];
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
  /** Si la persona tiene Mi Radar encendido y qué pregunta hoy (spec 019). Ausente en un backend anterior. */
  miRadar?: MiRadarApi | null;
}
