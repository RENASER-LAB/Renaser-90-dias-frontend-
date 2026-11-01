/**
 * Formas que devuelve el backend Java para hábitos. Nombres en camelCase porque así viaja el
 * cable: Spring Boot 4 serializa con Jackson 3 y las anotaciones de snake_case de Jackson 2 se
 * ignoraban en silencio (ver E-65 en `docs/BITACORA_ERRORES.md` del backend). No "corregir" esto
 * a snake_case leyendo un DTO viejo de Java.
 */

/** Un ítem de `GET /api/v1/habits` — el catálogo del aprendiz, sin horarios. */
export interface HabitoCatalogoApi {
  id: string;
  title: string;
  description: string | null;
  habitType: string;
  category: string;
  evidenceRequirement: string;
  isOptional: boolean;
  isSystemHabit: boolean;
  /** false = el aprendiz NO puede sacarlo de su plan. Distinto de isOptional, que es de puntaje. */
  isDeactivatable: boolean;
  /**
   * Dias de la semana en que aplica (`"MONDAY"`..`"SUNDAY"`), como los devuelve el backend desde
   * V28. Ausente contra un backend anterior; en ese caso el plan asume los 7 dias, que es lo que
   * hacia siempre antes de que este campo existiera.
   */
  activeWeekdays?: string[];
  /** Día de programa en que se desbloquea (1 = desde el arranque). */
  unlockDay?: number;
  /** Días que le faltan al aprendiz para llegar a `unlockDay`. 0 = ya disponible. */
  daysUntilUnlock?: number;
  /** `true` = todavía no le toca: se muestra con candado y no se puede marcar ni pausar. */
  locked?: boolean;
  /**
   * `Habito.claveSistema` del backend — la identidad FUNCIONAL de un hábito de catálogo
   * (`DAILY_CLASS`, `PASTILLA_RENACER`, `AUDIO_THERAPY_WEEKLY`...); `null` en los personales.
   *
   * Es el ÚNICO criterio estable para reconocer un hábito puntual desde el móvil: el `title` lo
   * puede renombrar el propio aprendiz (`PATCH /api/v1/habit-renames`), así que comparar por
   * texto se rompe en silencio. Opcional para tolerar un backend anterior a este campo.
   */
  systemKey?: string | null;
  /**
   * `Habito.iconoClave` — el icono curado de ESTE hábito (`SLEEP`, `WATER`, `PHONE_OFF`...), no el
   * de su categoría. Distingue una fila de otra dentro de la misma dimensión, que es lo que el
   * icono de categoría no podía hacer. `null` en los personales; ausente contra un backend viejo.
   */
  iconKey?: string | null;
  /**
   * D-254 del backend (2026-10-05): la racha de este hábito hasta hoy (días programados seguidos
   * cumplidos), con la misma regla que `TrackDelDiaApi.rachaDias`. Training la usa para el hábito sin
   * track de hoy (no le toca o está en pausa: la racha queda congelada). `undefined`/null contra un
   * backend anterior: la tarjeta no muestra racha.
   */
  rachaDias?: number | null;
}

/** La Clase Diaria: el hábito que abre la lección del día y pide un resumen para cerrarse. */
export const CLAVE_SISTEMA_CLASE_DIARIA = 'DAILY_CLASS';

/**
 * El post diario: el hábito que se cierra publicando en el Muro y no con el check.
 *
 * El backend NO lo deja completar por `POST /habit-tracks/{id}/complete` mientras no exista una
 * publicación de esa persona ese día (`PoliticaPostDiarioComunidad`): responde 400. Por eso el
 * móvil no puede "marcarlo y listo" antes de publicar — lo único que puede hacer es llevar al Muro.
 *
 * > **Corregido 2026-09-05 (E-117).** Acá decía que lo ÚNICO que el móvil puede hacer es llevar a
 * > publicar. Esa media frase de más fue el bug: DESPUÉS de publicar, el móvil no solo puede
 * > llamar a `/complete`, tiene que hacerlo — el backend implementó la mitad guardiana de la regla
 * > ("no lo cierres si no publicó") y nunca la mitad que dispara el cierre, así que el hábito
 * > quedaba pendiente para siempre. Lo dispara `cerrarHabitoPostDiarioComunidad`
 * > (`api/postDiarioComunidad.ts`), llamado desde el compositor del Muro.
 */
export const CLAVE_SISTEMA_POST_DIARIO_COMUNIDAD = 'COMMUNITY_POST';

/**
 * La categoría de un hábito, con el nombre que la API usa en el cable. Las cuatro de la Escuela viajan con su código en inglés
 * (`BODY`, `MIND`, `SPIRIT`, `CONSCIENCE`) y las que cada formación crea (spec 023) con su clave (`DIPLOMADO_ESTUDIO`): un texto abierto,
 * cuya lista y nombres salen del servidor (`features/habits/categorias`).
 */
export type CategoriaHabitoApi = string;

/**
 * Cuerpo de `POST /api/v1/habits` (`CreatePersonalHabitRequest` del backend).
 *
 * `scope`/`participantId` NO existen a propósito: el backend fuerza ámbito PERSONAL y el actor
 * autenticado. Un `habitType` distinto de `CHECKBOX` es aceptado por el DTO pero el propio
 * informe del backend (`docs/informes/habits-eleccion-y-personales.md`, pregunta abierta 5)
 * advierte que no está verificado que `JOURNALING`/`RATING`/`BLOCKING` funcionen sobre un hábito
 * PERSONAL, así que la app manda solo `CHECKBOX` — un hábito propio que se marca y listo.
 */
/** Los nombres de `DayOfWeek` del backend, que es el vocabulario de `/weekdays/{weekday}`. */
export type DiaSemanaApi =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface AltaHabitoPersonal {
  title: string;
  habitType: 'CHECKBOX';
  category: CategoriaHabitoApi;
  /** `GIMNASIO` | `CORRER` | `OTRO`. La app manda siempre `OTRO`: no hay pantalla que elija. */
  template: 'OTRO';
  goalLabel: string | null;
  /**
   * Icono elegido por el aprendiz (`SLEEP`, `WATER`…). Opcional: sin él, el hábito nace sin icono
   * propio y el móvil le pone el de su categoría, que es como nacían todos hasta 2026-09-07.
   */
  iconKey?: string | null;
  /** `HH:mm:ss` — obligatorio: sin hora de disparo el hábito no genera nada que hacer. */
  triggerTime: string;
  /**
   * Los días de la semana en que corre, con los nombres de `DayOfWeek`: `MONDAY`…`SUNDAY`.
   *
   * Omitirlo o mandarlo vacío significa **los siete**, que es como nacían todos los hábitos propios
   * hasta el 2026-09-08. El backend no cambia el `tipoDia` del catálogo: apaga los días que no
   * están en la lista para ESE participante (`horario_semanal_habito.activo`).
   */
  activeWeekdays?: DiaSemanaApi[];
  /** `HH:mm:ss` o null. Null = no vence dentro del día, que es el caso de un hábito propio. */
  limitTime: string | null;
}

/**
 * Un día de la semana de un hábito, con lo que el servidor resolvió para él (V39, V40 y, desde la spec 008,
 * V111). Es la forma COMÚN de `GET /habit-preferences/{id}/weekdays` y de `weekdays` dentro de cada ítem de
 * `GET /habit-preferences`: todo lo que no es el nombre del día es opcional, porque un backend anterior no
 * manda lo nuevo y porque la lista no repite `limitTime`.
 *
 * - `custom` (el endpoint del hábito) y `customTime` (la lista) dicen lo mismo: ese día tiene hora propia.
 *   Se leen los dos (`diasPropiosDe`): el contrato los nombra distinto y no se adivina cuál llega.
 * - `reminderEnabled` y `reminderMinutesList` son el aviso RESUELTO del día: el propio o, si no tiene, el
 *   general. `customReminder` dice si es propio. Sin `customReminder` el backend no sabe de avisos por día.
 */
/**
 * «Cómo suena» la alarma (spec 009, V112): los cuatro interruptores tal como viajan. Se lee con
 * `combinacionDeLaApi` (`notificaciones/utils/combinacionDeAlarma`), que devuelve `null` si algo no se entiende.
 */
export interface CombinacionDeAlarmaApi {
  sound: boolean;
  vibration: boolean;
  /** La voz dice el nombre del hábito. Necesita `sound`. */
  voice: boolean;
  /** Vuelve a sonar a los 5 y a los 10 minutos si no se atiende. */
  repeat: boolean;
}

export interface DiaDelHabitoApi {
  /** Nombre de `DayOfWeek`: `MONDAY`..`SUNDAY`. */
  weekday: string;
  /** `HH:mm:ss`, ya resuelta para ese día. */
  triggerTime?: string | null;
  /** `false` = ese día está apagado, todas las semanas (V40). Ausente contra un backend viejo. */
  active?: boolean;
  /** Spec 008: el aviso resuelto del día. */
  reminderEnabled?: boolean;
  reminderMinutesList?: number[] | null;
  customTime?: boolean;
  custom?: boolean;
  /** Spec 008: `true` solo si el aviso es propio del día. Ausente = el backend no informa avisos por día. */
  customReminder?: boolean;
  /** Spec 009: cómo suena la alarma ese día, ya resuelta (la propia o la general). Ausente = backend anterior. */
  alarm?: CombinacionDeAlarmaApi | null;
  /** Spec 009: `true` solo si la combinación es propia del día. Ausente = el backend no informa «cómo suena». */
  customAlarm?: boolean;
}

/**
 * Un día de `GET /api/v1/habit-preferences/{habitId}/weekdays` — la hora de ESE día (V39).
 *
 * Vienen los siete siempre, resueltos por el servidor: `custom` dice si ese día tiene hora propia
 * o si hereda la general. La pantalla no mezcla nada — esa mezcla es la precedencia y vive en el
 * backend, para que no existan dos implementaciones de la misma regla.
 */
export interface DiaDeLaSemanaApi extends DiaDelHabitoApi {
  /** `HH:mm:ss`, ya resuelta para ese día. */
  triggerTime: string | null;
  limitTime: string | null;
  custom: boolean;
}

/**
 * Spec 028: una FECHA concreta de un hábito, ya resuelta por el servidor (el plan de siempre con lo «solo esta semana» encima).
 * Es un `DiaDelHabitoApi` con su fecha: los campos de aviso y alarma valen igual, y `customTime`/`customReminder`/`customAlarm` son
 * `true` si el valor es propio del día de la semana O de la fecha. `customDate` dice si la fecha tiene fila propia («solo esta semana»).
 */
export interface FechaDelHabitoApi extends DiaDelHabitoApi {
  /** `YYYY-MM-DD`, en la zona de la persona. */
  date: string;
  /** `HH:mm:ss` o null. Solo en `GET …/{habitId}/week`. */
  limitTime?: string | null;
  /** La fecha tiene fila propia: es un cambio «solo esta semana». */
  customDate?: boolean;
  /** La fecha es posterior a hoy: se puede cambiar. Solo en `GET …/{habitId}/week`. */
  editable?: boolean;
}

/** `GET /api/v1/habit-preferences/{habitId}/week?weekStart=` — los siete días de una semana de un hábito. */
export interface SemanaDelHabitoApi {
  weekStart: string;
  weekEnd: string;
  days: FechaDelHabitoApi[];
}

/** Un día de `PUT …/{habitId}/week`: solo lo tocado; `reset` lo devuelve al plan de siempre. */
export interface CambioDeFechaApi {
  date: string;
  reset?: boolean;
  active?: boolean;
  /** `HH:mm` o `HH:mm:ss`. */
  triggerTime?: string;
  limitTime?: string | null;
  reminderEnabled?: boolean;
  reminderMinutesList?: number[];
  alarm?: CombinacionDeAlarmaApi;
}

/** Un día de la oferta de repetir: lo que quedaría en la fecha destino. */
export interface DiaDeLaOfertaApi {
  date: string;
  weekday: string;
  active: boolean;
  triggerTime?: string | null;
  reminderEnabled?: boolean | null;
  reminderMinutesList?: number[] | null;
  customTime?: boolean;
  customReminder?: boolean;
  alarm?: CombinacionDeAlarmaApi | null;
  /** Esa fecha ya tenía un cambio propio distinto, que se reemplazaría. */
  replaces?: boolean;
}

/** `GET /api/v1/habit-preferences/week-repeat` — repetir la semana en curso en la siguiente. */
export interface OfertaDeRepetirApi {
  sourceWeekStart: string;
  targetWeekStart: string;
  fingerprint: string;
  replacesOwnChanges: boolean;
  habits: { habitId: string; title: string; days: DiaDeLaOfertaApi[] }[];
  excluded: { habitId: string; title: string; reason: string }[];
}

/** `POST /api/v1/habit-preferences/week-repeat`. */
export interface ResultadoDeRepetirApi {
  targetWeekStart: string;
  copiedDays: number;
  removedDays: number;
  habits: number;
  excluded: { habitId: string; title: string; reason: string }[];
}

/** Un ítem de `GET /api/v1/habit-preferences` — el horario, propio o el del catálogo. */
export interface PreferenciaHabitoApi {
  habitId: string;
  title: string;
  /** `HH:mm:ss`. Nulo cuando el hábito no tiene hora de disparo definida. */
  triggerTime: string | null;
  /** `HH:mm:ss`. Nulo = el hábito no vence dentro del día. */
  limitTime: string | null;
  /** true si el aprendiz cambió el horario respecto del catálogo. */
  customized: boolean;
  /**
   * El recordatorio de este hábito. Ausente contra un backend anterior al 2026-09-07: hasta
   * entonces el PATCH los escribía y el GET no los devolvía, así que no había forma de leerlos de
   * vuelta y el móvil los mandaba en `false`/`null` en cada guardado — apagando el recordatorio
   * cada vez que alguien tocaba la hora.
   */
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number | null;
  /**
   * TODOS los avisos elegidos, en minutos antes («30 min antes» y «a la hora» = `[30, 0]`), desde V81
   * (D-217, 2026-09-28). `reminderMinutesBefore` sigue siendo el más temprano, para el APK viejo.
   * `null`/ausente = el servidor no conoce el conjunto (guardado antes de V81, o por el APK viejo).
   */
  reminderMinutesList?: number[] | null;
  /**
   * Cambio de horario ya guardado que todavía NO rige: el backend lo programa para el día
   * siguiente cuando la ventana del hábito ya arrancó hoy ("no se improvisa el día").
   * `null` cuando no hay nada pendiente.
   *
   * Estaba tipado como `unknown` y la app lo descartaba, y ese era justo el dato que faltaba
   * para poder mostrar "hoy a las 07:00, desde mañana a las 09:00" en vez de dar la sensación
   * de que el cambio no se guardó.
   */
  pendingChange: CambioProgramadoApi | null;
  /**
   * Spec 008: los siete días ya resueltos (hora y aviso de cada uno). Ausente contra un backend anterior:
   * ahí la app se comporta como siempre, con una alarma diaria a la hora general.
   */
  weekdays?: DiaDelHabitoApi[];
  /**
   * Spec 009: cómo suena la alarma del hábito (la general, ya resuelta). Ausente contra un backend anterior: la
   * pantalla no ofrece «Cómo suena» y las alarmas suenan como siempre.
   */
  alarm?: CombinacionDeAlarmaApi | null;
  /**
   * Spec 028: las fechas de este hábito con cambio «solo esta semana», desde hoy y hasta 20 días, ya resueltas. Ausente o vacío = ninguna
   * (backend anterior): las alarmas son las de siempre.
   */
  dateOverrides?: FechaDelHabitoApi[];
}

/** `effectiveDate` es `YYYY-MM-DD`; las horas son `HH:mm:ss` crudas, igual que el resto del wire. */
export interface CambioProgramadoApi {
  triggerTime: string | null;
  limitTime: string | null;
  effectiveDate: string;
}

/** Un ítem de `GET /api/v1/habit-tracks/today` — lo que hay que hacer HOY, ya con su estado. */
export interface TrackDelDiaApi {
  id: string;
  habitoId: string;
  fechaEjecucion: string;
  diaPrograma: number;
  tipoDia: string;
  esOpcional: boolean;
  estado: string;
  puntosOtorgados: number;
  respuestaTexto: string | null;
  calificacionProductividad: number | null;
  completadoEn: string | null;
  tituloHabito: string;
  tipoHabito: string;
  guia: unknown | null;
  triggerTime?: string | null;
  horaDisparo: string | null;
  horaLimite: string | null;
  /** Puntos que paga completarlo ahora. Null si ya está en estado terminal, o si el backend es
   * anterior al 2026-09-05 y todavía no manda el campo. */
  puntosEnJuego?: number | null;
  /** Techo de la escala de puntos (hoy 10). Ver `puntosEnJuego`. */
  puntosMaximos?: number | null;
  /** Instante ISO en que el hábito se bloquea; null si no vence. */
  plazoEvidencia?: string | null;
  /** Si el track ya tiene al menos una evidencia subida, en cualquier estado de validación.
   * `undefined` contra un backend anterior al 2026-09-05 (D-113), y ahí se trata como `false`. */
  tieneEvidencia?: boolean;
  /**
   * D-226 del backend: solo en los hábitos que registran un número (hoy KILÓMETROS DIARIOS). La
   * unidad, lo registrado ese día (null mientras no se complete) y el total acumulado del programa.
   * `undefined`/null en los demás hábitos y contra un backend anterior.
   */
  medicion?: MedicionDelTrackApi | null;
  /**
   * D-254 del backend (2026-10-05): la racha de este hábito en días programados seguidos cumplidos,
   * hasta hoy. `undefined`/null contra un backend anterior: la tarjeta no muestra racha.
   */
  rachaDias?: number | null;
}

/** D-226: la medición de un track (`GET /habit-tracks/today`). `unidad` hoy solo `KILOMETROS`. */
export interface MedicionDelTrackApi {
  unidad: string;
  valorDelDia: number | null;
  total: number;
}

/**
 * Un hábito dentro del plan de ESTE aprendiz — `GET /api/v1/habit-unlocks` (E-145).
 *
 * Es la única fuente de la pausa: `habitos.activo` es del catálogo compartido y lo escribe solo
 * el panel admin, así que no puede expresar "yo lo pausé hasta el domingo".
 */
export interface DesbloqueoHabitoApi {
  habitId: string;
  unlockDay: number;
  chosenAt: string | null;
  /** Hay una pausa REGISTRADA. Si además sigue vigente hoy lo decide quien lee, con `pausedUntil`. */
  paused: boolean;
  /** Último día INCLUSIVE de la pausa (`yyyy-MM-dd`), o `null` si es indefinida. */
  pausedUntil: string | null;
}

/** La respuesta completa de `GET /api/v1/habit-unlocks`. */
export interface PlanDesbloqueosApi {
  enabled: boolean;
  items: DesbloqueoHabitoApi[];
}
