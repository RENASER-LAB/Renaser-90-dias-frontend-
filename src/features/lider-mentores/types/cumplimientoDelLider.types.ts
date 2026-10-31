import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';

/**
 * Lo que dibujan las pantallas del cumplimiento por persona (spec 005; contrato en
 * `Renaser-90-dias-backend/specs/005-lider-cumplimiento-por-persona/contracts/leadership-cumplimiento.md`).
 *
 * Son los datos ya normalizados (`api/cumplimientoDelLiderSchemas.ts`): nada de `undefined` donde el
 * servidor no mandó algo, y la falta de datos nunca se confunde con un incumplimiento.
 */

/** A quién se le avisa de una observación sobre la persona (`mentor` de la semana). */
export interface MentorDeLaPersona {
  id: string;
  nombre: string | null;
}

/**
 * Un archivo o un texto que respalda un cumplimiento. `tipo` es `FOTO`, `VIDEO`, `AUDIO` o `TEXTO` en
 * mayúsculas, o `null` si el servidor no lo dijo (se averigua al abrirla).
 */
export interface EvidenciaDeLaObligacion {
  id: string;
  tipo: string | null;
  subidaEn: string | null;
}

/** Un hábito del día, tal como la persona lo tenía ESE día (no el de hoy proyectado hacia atrás). */
export interface ObligacionDeLaPersona {
  registroId: string;
  titulo: string;
  /** `PENDIENTE` | `EN_CURSO` | `COMPLETADO` | `FALLIDO` | `EXPIRADO`; otro valor se lee como sin estado. */
  estado: string;
  requiereEvidencia: boolean;
  /** `NO_REQUERIDA` | `SIN_ENTREGA` | `ENTREGADA`. `null` si no vino. */
  entrega: string | null;
  entregadaEn: string | null;
  /** `null` cuando no hay entrega: nunca se convierte en «rechazada». */
  revision: string | null;
  evidenciaId: string | null;
  /** El «¿Qué sentiste?» o el resumen de la Pastilla. */
  respuestaTexto: string | null;
  evidencias: EvidenciaDeLaObligacion[];
  /** El post diario: la publicación del Muro con la que se cumplió. */
  publicacionId: string | null;
}

/**
 * Una acción del día de los objetivos (la «roca» diaria) con su foto, si la tiene. `estado` es `COMPLETADA` o
 * `PENDIENTE` (contrato §2): una acción se completa solo entregando evidencia, así que la completada trae
 * `evidenciaId` y la pendiente no.
 */
export interface AccionDeLaPersona {
  id: string;
  titulo: string;
  estado: string;
  evidenciaId: string | null;
}

export interface DiaDeLaPersona {
  fecha: string;
  diaDePrograma: number | null;
  /**
   * Por qué el día no tiene porcentaje: `SIN_NADA_PLANIFICADO`, `NO_ACTIVADO`, `PENDIENTE_DE_CALCULO`,
   * `CUENTA_SUSPENDIDA`, `PAUSADO`, `FUERA_DEL_PROGRAMA` y `EN_CURSO` (hoy, que solo llega al pedir el viernes de
   * hoy: tiene datos reales, pero el semáforo solo mide los días cerrados). `FUTURO` (un día que no llegó) ya no lo
   * manda el servidor —la ventana no llega al futuro—, pero la app lo sigue leyendo sin romperse. Se dice en
   * palabras; **nunca** se cuenta como incumplido.
   */
  motivo: string | null;
  obligaciones: ObligacionDeLaPersona[];
  acciones: AccionDeLaPersona[];
}

export interface ResumenDeLaSemana {
  obligaciones: number;
  cumplidas: number;
  conEntrega: number;
  pendientes: number;
  sinCumplir: number;
}

/**
 * Spec 018: si la persona «programó» su día de HOY (no de la ventana de siete días). Lo cuenta y lo decide el servidor
 * —al menos la mitad de sus hábitos con la hora que ella eligió y todas las acciones de hoy agendadas—; la app solo lo
 * dice: `programo` es el «Sí» / «No» y las cuentas son el detalle de abajo.
 */
export interface ProgramacionDeLaPersona {
  /** De los hábitos que le tocan hoy (ni apagados ni en pausa), cuántos tienen hora propia. */
  habitosConHora: number;
  habitosTotal: number;
  /** De las acciones de sus objetivos para hoy, cuántas tienen hora de inicio. */
  accionesConHora: number;
  accionesTotal: number;
  programo: boolean;
}

/** `GET /api/v1/leadership/groups/{g}/people/{p}/week`. */
export interface SemanaDePersona {
  grupoId: string | null;
  personaId: string;
  nombre: string | null;
  avatarUrl: string | null;
  /** `TRAINEE`, `MENTOR`, `TRAINEE_GUIDE`…; `null` si el servidor no lo dijo. */
  rol: string | null;
  /** El primer día de los 7 que se miran: la ventana del resumen (los que terminan ayer) o el sábado de una semana. */
  desde: string;
  /** El último día: ayer en la ventana vigente, o el viernes que cierra la semana elegida. */
  hasta: string;
  zona: string | null;
  /** `!cerrada`: la semana en la que cae el último día todavía no cerró (la vigente de un lunes, por ejemplo). */
  semanaEnCurso: boolean;
  /** El último día cae en una semana ya cerrada: sale del calendario del servidor. */
  cerrada: boolean;
  /**
   * El sábado que abre la semana del Día 1 de la persona; antes de ahí no hay nada que ver. `null` mientras no
   * eligió su Día 1: entonces la app no inventa un tope y es el servidor quien contesta cada semana.
   */
  primeraSemana: string | null;
  /**
   * `null` si el grupo no tiene mentor vigente **o si la persona es el propio mentor del grupo**: en los dos
   * casos «Avisar a su mentor» no aparece.
   */
  mentor: MentorDeLaPersona | null;
  /**
   * Si el servidor deja avisar al mentor de esta persona (2026-10-31). `null` = no lo dijo (un backend anterior): vale la
   * regla de siempre, que es haber mentor. Con `false`, «Avisar a su mentor» no se ofrece aunque haya mentor.
   */
  puedeAvisarAlMentor?: boolean | null;
  resumen: ResumenDeLaSemana | null;
  /** Sin porcentaje no hay color (`SIN_DATOS`). Con `noSeMide`, el color es `SIN_DATOS` y el % sí se muestra. */
  color: ColorSemaforo;
  etiqueta: string | null;
  noSeMide: boolean;
  porcentaje: number | null;
  dias: DiaDeLaPersona[];
  /**
   * `null` si el servidor no la manda: un backend anterior (la ficha queda como antes, sin la tarjeta «¿Programó?»), o no
   * hay nada que programar hoy (ausente y `null` se leen igual). La app no la inventa ni la calcula.
   */
  programacion?: ProgramacionDeLaPersona | null;
}

/** `GET /api/v1/wall/{id}`: la publicación del Muro del post diario. */
export interface PublicacionDelMuro {
  id: string | null;
  autor: string | null;
  avatarUrl: string | null;
  texto: string;
  creadaEn: string | null;
  fotos: Array<{ url: string }>;
}
