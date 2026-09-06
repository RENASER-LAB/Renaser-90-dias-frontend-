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
   * Cambio de horario ya guardado que todavía NO rige: el backend lo programa para el día
   * siguiente cuando la ventana del hábito ya arrancó hoy ("no se improvisa el día").
   * `null` cuando no hay nada pendiente.
   *
   * Estaba tipado como `unknown` y la app lo descartaba, y ese era justo el dato que faltaba
   * para poder mostrar "hoy a las 07:00, desde mañana a las 09:00" en vez de dar la sensación
   * de que el cambio no se guardó.
   */
  pendingChange: CambioProgramadoApi | null;
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
}
