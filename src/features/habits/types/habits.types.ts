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
 * móvil no puede "marcarlo y listo" — lo único que puede hacer es llevar a publicar.
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
}
