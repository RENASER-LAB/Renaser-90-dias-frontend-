/**
 * «Cierra tu día» (spec 017): lo que la app lee y escribe de `GET/PUT /api/v1/rocks/day-closure` (la persona, en
 * Training) y de `GET …/cierres?semana=` (su acompañamiento, en la ficha). Contrato en
 * `Renaser-90-dias-backend/specs/017-cierre-del-dia/contracts/api.md`.
 *
 * Los valores de `motivo` y `manana` viajan como el nombre de la constante. Acá se leen como texto abierto: un valor
 * que esta versión de la app no conoce no la rompe (se muestra sin etiqueta, o no se puede elegir de nuevo).
 */

/** ¿Qué pasó? */
export type MotivoDelCierre = 'SIN_TIEMPO' | 'SURGIO_OTRA_COSA' | 'SIN_ENERGIA' | 'PARA_DESPUES';

/** ¿Qué harás mañana? */
export type PlanDeManana = 'OTRA_HORA' | 'MAS_CORTA' | 'PEDIR_AYUDA' | 'DEJARLA';

/** `ABIERTO`: hoy, sin cerrar. `CERRADO`. `SIN_CERRAR`: un día que ya terminó sin cierre (no se penaliza). */
export type EstadoDelCierre = 'ABIERTO' | 'CERRADO' | 'SIN_CERRAR';

/** Lo que la persona dijo de una acción que quedó pendiente. */
export interface RespuestaDelCierre {
  motivo: string | null;
  manana: string | null;
  nota: string | null;
}

export interface AccionDelCierre {
  id: string;
  titulo: string;
  /** `HH:mm`, o `null` si la acción no tiene hora. */
  horaInicio: string | null;
  cumplida: boolean;
  /** Instante ISO en que se cumplió; la app lo muestra en la hora del teléfono. */
  cumplidaEn: string | null;
  /** `null` en una cumplida y en una pendiente sin respuesta guardada. */
  cierre: RespuestaDelCierre | null;
  /**
   * ¿Al cerrar hoy se pregunta por esta acción? Lo dice el servidor con SU reloj y la zona de la persona (decisión del dueño,
   * 2026-10-30): solo se pregunta por las pendientes cuya hora ya llegó, o que no tienen hora. `false` = pendiente cuya hora
   * todavía no llega (no se pregunta ni se exige). `null` o ausente = el servidor no lo dijo (uno anterior, o la ficha del
   * acompañamiento): se trata como siempre, o sea que se pregunta.
   */
  exigeRespuesta?: boolean | null;
}

export interface DiaDelCierre {
  /** `yyyy-MM-dd`. */
  fecha: string;
  /** `null` si el servidor mandó un estado que esta versión no entiende y no hay cierre guardado. */
  estado: EstadoDelCierre | null;
  /** Instante ISO del PRIMER cierre; `null` si no se cerró. */
  cerradoEn: string | null;
  /** La nota del día (la que se escribe cuando no queda ninguna acción pendiente). */
  nota: string | null;
  acciones: AccionDelCierre[];
}

/** Acciones de la semana de programa, hasta hoy: cuántas se cumplieron de las planificadas. */
export interface AvanceDeLaSemana {
  cumplidas: number;
  planificadas: number;
}

/** La lectura de UN día de la persona (`GET /rocks/day-closure`). */
export interface CierreDelDia extends DiaDelCierre {
  /** `true` solo si `fecha` es hoy en la zona de la persona. */
  puedeCerrar: boolean;
  /** Solo viene para hoy, con el Día 1 elegido. */
  semana: AvanceDeLaSemana | null;
}

export interface MotivoQueSeRepite {
  motivo: string;
  veces: number;
}

export interface ResumenDeLosCierres {
  cerrados: number | null;
  sinCerrar: number | null;
  motivos: MotivoQueSeRepite[];
}

/** La semana de cierres de una persona, para su acompañamiento (`GET …/cierres?semana=`). */
export interface CierresDeLaSemana {
  /** El lunes (`yyyy-MM-dd`). */
  semana: string;
  /** El lunes de la primera semana de su programa; `null` = todavía no eligió su Día 1. Tope de ‹. */
  primeraSemana: string | null;
  /** Del Día 1 (o el lunes) a hoy (o el domingo), en orden. Nunca un día que viene. */
  dias: DiaDelCierre[];
  /** `null` si el servidor no mandó el resumen: la sección dibuja solo los días. */
  resumen: ResumenDeLosCierres | null;
}

/**
 * Cómo pide una ficha una semana de cierres. `null` o sin valor = la semana en curso de la persona. Cada ficha pasa la
 * suya (mentor y guía: `/mentor/…`; líder, administrador y alquimista: `/leadership/…`) y la sección no sabe de rutas
 * ni de roles. **Tiene que ser estable** (un `useMemo` por persona): es la llave de lo que se guarda mientras la ficha
 * está abierta.
 */
export type CargarCierres = (semana?: string | null) => Promise<CierresDeLaSemana>;

/** Lo que manda el `PUT`: una respuesta por cada acción que siga pendiente, más la nota del día. */
export interface CuerpoDelCierre {
  fecha: string;
  acciones: Array<{ id: string; motivo: string; manana: string; nota?: string }>;
  nota?: string;
}
