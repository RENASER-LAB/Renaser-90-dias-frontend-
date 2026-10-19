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

/** Una acción del día de los objetivos (la «roca» diaria) con su foto, si la tiene. */
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
   * Por qué el día no tiene nada que medir: `NO_ACTIVADO`, `PAUSADO`, `CUENTA_SUSPENDIDA`,
   * `SIN_NADA_PLANIFICADO`. Se dice en palabras; **nunca** se cuenta como incumplido.
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

/** `GET /api/v1/leadership/groups/{g}/people/{p}/week`. */
export interface SemanaDePersona {
  grupoId: string | null;
  personaId: string;
  nombre: string | null;
  avatarUrl: string | null;
  /** El sábado que abre la semana. */
  desde: string;
  /** El viernes que la cierra. */
  hasta: string;
  zona: string | null;
  /** `true` en la semana de hoy: no hay una siguiente (el futuro no se mide). */
  semanaEnCurso: boolean;
  /** El sábado de la primera semana del programa de la persona; antes de ahí no hay nada que ver. */
  primeraSemana: string | null;
  /** `null` si el grupo no tiene mentor vigente: ahí «Avisar a su mentor» no aparece. */
  mentor: MentorDeLaPersona | null;
  resumen: ResumenDeLaSemana | null;
  /** Sin porcentaje no hay color (`SIN_DATOS`). Con `noSeMide`, el color es `SIN_DATOS` y el % sí se muestra. */
  color: ColorSemaforo;
  etiqueta: string | null;
  noSeMide: boolean;
  porcentaje: number | null;
  dias: DiaDeLaPersona[];
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
