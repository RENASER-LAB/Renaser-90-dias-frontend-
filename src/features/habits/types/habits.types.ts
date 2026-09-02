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
  pendingChange: unknown | null;
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
