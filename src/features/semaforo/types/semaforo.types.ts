/**
 * El semáforo de cumplimiento del aprendiz (D-168), tal como lo pinta la app.
 *
 * Contrato: `docs/arquitectura/SEMAFORO_DEL_APRENDIZ.md` del backend, §4.1 (el detalle de una
 * persona: `GET /api/v1/me/semaforo` y sus gemelas del mentor y de administración), §4.2 (el campo
 * `semaforo` de `GET /api/v1/home`), §4.3 (la tabla de un grupo) y §4.4 (el resumen por grupos).
 * Ese documento es la única fuente: si algo de acá no coincide con él, manda él.
 *
 * **No confundir con** la coherencia de Hoy (solo objetivos), el ritmo de objetivos ni el semáforo
 * operativo del mentor: son cuatro indicadores distintos que comparten palabras.
 *
 * Estos tipos son lo que queda DESPUÉS de validar y normalizar (`api/semaforoSchemas.ts`): sin
 * `undefined`, con los colores y estados ya reducidos a los que la app conoce. Un valor que el
 * backend agregue mañana no rompe nada — se lee como "sin datos", que es el lado seguro: nunca
 * verde por falta de datos.
 *
 * **La app no recalcula nada.** Porcentajes, colores, promedios y cortes vienen del servidor; acá
 * solo se eligen palabras y se dibuja.
 */

/** Los cuatro colores del contrato. `SIN_DATOS` también cubre cualquier color que la app no conozca. */
export type ColorSemaforo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_DATOS';

/**
 * Por qué un día tiene o no tiene porcentaje. Solo `MEDIDO` lo tiene.
 *
 * `DESCONOCIDO` no existe en el backend: es cómo se lee acá un estado nuevo que esta versión de la
 * app no sabe nombrar. Se pinta neutro y no se afirma nada sobre ese día.
 */
export type EstadoDiaSemaforo =
  | 'MEDIDO'
  | 'SIN_DATOS'
  | 'PAUSADO'
  | 'PENDIENTE'
  | 'FUERA_DEL_PROGRAMA'
  | 'DESCONOCIDO';

/** Cuánto contaba y cuánto se cumplió de una cosa en un día. */
export interface ConteoDelDia {
  programados: number;
  cumplidos: number;
}

/** Un día del semáforo. `fecha` es `yyyy-MM-dd` en la zona de la persona, sin hora. */
export interface DiaDelSemaforo {
  fecha: string;
  estado: EstadoDiaSemaforo;
  /** Entero 0..100. `null` si el día no es `MEDIDO` — y entonces NO es 0. */
  porcentaje: number | null;
  color: ColorSemaforo;
  /** `null` cuando el servidor no lo manda: la app no rellena con ceros. */
  habitos: ConteoDelDia | null;
  objetivos: ConteoDelDia | null;
}

/** La ventana vigente: los últimos 7 días cerrados (ayer y los 6 anteriores, en su zona). */
export interface VentanaDelSemaforo {
  desde: string;
  hasta: string;
  /** Promedio con un decimal, tal cual llega. `null` = ningún día con algo programado. */
  porcentaje: number | null;
  color: ColorSemaforo;
  /** La palabra que manda el servidor. `null` si no vino: se usa la del color. */
  etiqueta: string | null;
  /** Cuántos de los 7 días entraron al promedio. `null` si no vino: no se muestra la línea. */
  diasConDatos: number | null;
  /** `true` solo si coincide con una semana ya cerrada el sábado. */
  cerrada: boolean;
  /** Los 7 días, del más viejo al más nuevo. */
  dias: DiaDelSemaforo[];
}

/** Una semana sábado→viernes ya cerrada: la foto de lo que se reportó. No cambia. */
export interface SemanaCerrada {
  desde: string;
  hasta: string;
  porcentaje: number | null;
  color: ColorSemaforo;
  etiqueta: string | null;
  diasConDatos: number | null;
  /** Instante ISO-8601 del cierre. */
  cerradaEn: string | null;
}

/** Pausa del staff con programa propio. Las dos fechas son locales e inclusive. */
export interface PausaDelSemaforo {
  desde: string;
  hasta: string;
}

/** `GET /api/v1/me/semaforo` (y la respuesta de pausar y de volver a medir). */
export interface DetalleDelSemaforo {
  /** `false` = sin programa activado: no hay nada que medir. */
  aplica: boolean;
  /**
   * `true` para el aprendiz: no se puede pausar. `false` para el staff con programa propio.
   * Si el servidor no lo dijera, se asume `true` — sin permiso declarado, el control de pausa
   * no aparece, que es el lado seguro del error.
   */
  obligatorio: boolean;
  /** Zona de la persona (`America/Lima`). Informativa: las fechas ya vienen en esa zona. */
  zona: string | null;
  pausa: PausaDelSemaforo | null;
  vigente: VentanaDelSemaforo | null;
  /** Semanas cerradas, de la más vieja a la más nueva. */
  semanas: SemanaCerrada[];
  /** Última vez que el barrido escribió algo de esta persona. `null` si nunca. */
  calculadoEn: string | null;
}

/** El campo `semaforo` de `GET /api/v1/home`: lo justo para la tarjeta de Hoy. */
export interface SemaforoDeHoy {
  color: ColorSemaforo;
  etiqueta: string | null;
  porcentaje: number | null;
  diasConDatos: number | null;
  pausado: boolean;
  /**
   * Los 7 días de la ventana vigente, en su forma corta (sin los conteos de hábitos y objetivos):
   * lo justo para las barritas de la tarjeta. Campo aditivo del backend. `null` si no vino —un
   * backend anterior, o mal formado—, y entonces la tarjeta los saca de `/me/semaforo` como antes.
   */
  dias: DiaDelSemaforo[] | null;
}

// ------------------------------------------------------------------------------------------
// Las vistas de quien acompaña o supervisa (contrato §4.3 y §4.4)
// ------------------------------------------------------------------------------------------

/**
 * Cuántas personas hay en cada color. Cifras del servidor: la app no las cuenta de nuevo con las
 * filas que tiene a mano (podrían no coincidir, y entonces la pantalla se contradiría sola).
 */
export interface ResumenPorColor {
  verde: number;
  amarillo: number;
  rojo: number;
  sinDatos: number;
  total: number;
}

/**
 * Lo que tienen en común la tabla de un grupo y el resumen por grupos: qué días cubren. Es lo que
 * necesita la navegación entre semanas.
 */
export interface VentanaSemanal {
  desde: string;
  hasta: string;
  /** `true` si es una semana sábado→viernes ya cerrada. La ventana vigente casi nunca lo es. */
  cerrada: boolean;
}

/** Una fila de la tabla de un grupo (§4.3): una persona, CON nombre. Solo mentor y administración. */
export interface AprendizDelSemaforo {
  aprendizId: string;
  /** `null` si el servidor no lo manda: la fila dice «Aprendiz sin nombre», no inventa uno. */
  nombre: string | null;
  avatarUrl: string | null;
  /** Promedio con un decimal, tal cual llega. `null` = sin datos (y entonces el color es `SIN_DATOS`). */
  porcentaje: number | null;
  color: ColorSemaforo;
  etiqueta: string | null;
  diasConDatos: number | null;
  /** Los días en su forma corta, del más viejo al más nuevo. Vacío si la persona no se mide. */
  dias: DiaDelSemaforo[];
}

/** `GET /api/v1/mentor/groups/{groupId}/semaforo` y `GET /api/v1/admin/semaforo/groups/{groupId}`. */
export interface SemaforoDelGrupo extends VentanaSemanal {
  grupoId: string | null;
  grupoNombre: string | null;
  /** `null` si no vino: se deja de mostrar la línea de cantidades, no se cuenta en el teléfono. */
  resumen: ResumenPorColor | null;
  /** En el orden del servidor (rojo, amarillo, sin datos, verde; por nombre dentro de cada color). */
  aprendices: AprendizDelSemaforo[];
}

/** Una fila del resumen por grupos (§4.4). **Sin nombres de aprendices** (RL-07). */
export interface GrupoDelResumen {
  grupoId: string;
  grupoNombre: string | null;
  mentorNombre: string | null;
  resumen: ResumenPorColor | null;
  /**
   * Promedio de los porcentajes de sus aprendices con datos, un decimal. `null` = ninguno tuvo
   * datos: nunca un 0 %. El contrato no le da color ni palabra, y la app no se los inventa.
   */
  promedio: number | null;
}

/** `GET /api/v1/semaforo/groups`: líder de mentores, administración y alquimista. */
export interface ResumenPorGrupos extends VentanaSemanal {
  totales: ResumenPorColor | null;
  /** En el orden del servidor. */
  grupos: GrupoDelResumen[];
}
