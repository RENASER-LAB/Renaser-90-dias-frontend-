/**
 * «Hábitos de todos» del líder de mentores (spec 029; `GET /api/v1/leadership/habits` y `…/habits/{id}/people`): un día,
 * hábito por hábito, quién cumplió y quién no entre todos los alumnos de sus formaciones. Solo lectura.
 */

/**
 * Cómo le fue a UNA persona con UN hábito ese día (los estados de la ficha):
 * - `CUMPLIDO`; `PENDIENTE` = no lo hizo y su día no cerró (hoy); `SIN_CUMPLIR` = su día cerró sin cumplirlo;
 * - `SIN_DATOS` = no hay nada que medir (no le tocaba, pausa, todavía no empezaba, opcional): **nunca una falta**.
 * Un estado que esta versión no conoce se lee como `SIN_DATOS`: jamás como un incumplimiento.
 */
export type EstadoEnUnHabito = 'CUMPLIDO' | 'PENDIENTE' | 'SIN_CUMPLIR' | 'SIN_DATOS';

/** Por qué no hay datos (solo con `SIN_DATOS`). */
export type MotivoSinDatos = 'NO_EXIGIBLE' | 'NO_LE_TOCABA' | 'ANTES_DEL_DIA_1';

/** Un hábito del catálogo ese día, visto de todos los alumnos. */
export interface HabitoDeTodos {
  habitoId: string;
  /** El título del catálogo, tal como llega (se dibuja en tipo oración). */
  titulo: string;
  /** El código con que la API de hábitos dice la categoría (`BODY`… o la clave). */
  categoria: string;
  /** La clave de la base de la categoría (`CUERPO`, `DIPLOMADO_ESTUDIO`…); con ella se filtra. */
  categoriaClave: string | null;
  /** El nombre de la categoría si el servidor lo manda; si no, se deduce de las cuatro conocidas. */
  nombreDeLaCategoria: string | null;
  formacion: string | null;
  /** A cuántos alumnos les tocaba (cumplieron + pendientes + sin cumplir). */
  esperados: number;
  cumplieron: number;
  pendientes: number;
  sinCumplir: number;
}

export interface TotalesDelDia {
  alumnos: number;
  conHabitos: number;
  esperados: number;
  cumplieron: number;
  pendientes: number;
  sinCumplir: number;
}

export interface HabitosDeTodos {
  /** `YYYY-MM-DD` del día que se mira. */
  fecha: string;
  esHoy: boolean;
  /** Los límites de la navegación: hoy y 7 días atrás. `null` = el servidor no los dijo y no se adivinan. */
  masAntigua: string | null;
  masReciente: string | null;
  totales: TotalesDelDia;
  /** Ya vienen con los de menos cumplimiento primero: la app no los reordena. */
  habitos: HabitoDeTodos[];
}

/** Una persona frente a un hábito ese día. */
export interface PersonaEnUnHabito {
  personaId: string;
  nombre: string;
  fotoPath: string | null;
  grupoId: string | null;
  grupoNombre: string | null;
  estado: EstadoEnUnHabito;
  motivo: MotivoSinDatos | null;
  /** `HH:mm`: la hora que ESA persona tiene para el hábito ese día. */
  horaPlanificada: string | null;
  /** `HH:mm` en la zona de la persona. */
  cumplioA: string | null;
  /** La evidencia entregada, para abrir la hoja de siempre. */
  evidenciaId: string | null;
}

export interface PersonasDeUnHabito {
  fecha: string;
  esHoy: boolean;
  habito: HabitoDeTodos | null;
  pagina: number;
  tamano: number;
  total: number | null;
  hayMas: boolean;
  personas: PersonaEnUnHabito[];
}

/** Lo que se pide: el día (`null` = hoy) y los filtros. Un filtro `null` no se manda. */
export interface FiltrosDeLosHabitos {
  fecha: string | null;
  /** Un id de grupo o `none` (sin grupo). */
  grupo: string | null;
  formacion: string | null;
  categoria: string | null;
}
