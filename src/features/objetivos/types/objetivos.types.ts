/**
 * Formas EXACTAS que devuelve el backend Java para las Rocas Maestras — el objetivo de 90 días
 * (`rocks/infrastructure/adapter/in/rest/rocamaestra` en el repo Spring).
 *
 * Separadas de los tipos de la pantalla, igual que en `features/community`: el cable habla en
 * inglés y en enums (`CUERPO`/`TRABAJO`/`RELACIONES`), y la UI habla el vocabulario del diseño.
 */

/** Los tres ejes del programa. El backend los valida como enum: mandar otro da 400. */
export type EjeObjetivo = 'CUERPO' | 'TRABAJO' | 'RELACIONES';

export const EJES: EjeObjetivo[] = ['CUERPO', 'TRABAJO', 'RELACIONES'];

/** Cómo se llama cada eje en la pantalla. El backend no manda etiquetas, solo el enum. */
export const ETIQUETA_EJE: Record<EjeObjetivo, string> = {
  CUERPO: 'Cuerpo',
  TRABAJO: 'Negocio y dinero',
  RELACIONES: 'Relaciones',
};

/**
 * `RocaMaestraResponse` del backend.
 *
 * `meta`, `avance`, `unidad` y `porcentaje` vienen en `null` cuando el objetivo es puramente
 * cualitativo ("recuperar la confianza con mi hijo"): esa persona no tiene barra de avance que
 * dibujar, y eso es válido. Los cuatro van juntos o ninguno.
 *
 * `porcentaje` llega ya calculado a propósito: es una regla de negocio (incluido el tope de 100
 * al superar la meta) y si cada pantalla lo recalculara, dos vistas mostrarían números distintos
 * para el mismo dato.
 */
export interface RocaMaestraApi {
  id: string;
  eje: EjeObjetivo;
  objetivo: string;
  meta: number | null;
  avance: number | null;
  unidad: string | null;
  /** Desde dónde arrancó. `null` en las rocas anteriores a V43. Ver `DefinicionRocaMaestra`. */
  lineaBase: number | null;
  porcentaje: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

/** Cuerpo de `PUT /api/v1/rocks/master/{eje}`. Sin `eje` ni dueño: van en la ruta y en la sesión. */
export interface DefinicionRocaMaestra {
  objetivo: string;
  /** Los tres juntos o los tres ausentes. El backend rechaza media meta con un 400. */
  meta?: number;
  avance?: number;
  unidad?: string;
  /**
   * Desde dónde arrancó. **Opcional en el cable, obligatorio en la práctica** (E-166).
   *
   * Con este dato el porcentaje mide el camino recorrido —`|avance − base| / |meta − base|`— y por
   * eso funciona igual para una meta que sube que para una que baja. Sin él, el backend usa la
   * fórmula vieja `avance / meta`, que da 100 % el primer día a cualquiera que quiera bajar de peso
   * o de deuda. Se dejó opcional solo para no romper las filas anteriores a la migración V43.
   *
   * No puede ser igual a `meta`: sin distancia no hay avance que medir, y el backend lo rechaza.
   */
  lineaBase?: number;
}

/* ------------------------------------------------------------------------------------------------
 * Nivel semanal — `rocks/.../rest/rocasemanal`
 * ---------------------------------------------------------------------------------------------- */

/**
 * `RocaSemanalResponse` del backend.
 *
 * **Ojo con lo que NO trae: el eje.** La respuesta identifica a la maestra por `rocaMaestraId`, no
 * por eje, así que para saber si una roca semanal es de CUERPO hay que cruzarla contra las maestras
 * (`useRocasMaestras`). Es la razón por la que `useRocasSemanales` recibe las maestras en vez de
 * pedirlas por su cuenta.
 *
 * > **Corregido el 2026-09-23.** Acá decía que `accionesCriticas` son siempre **tres, ya ordenadas
 * > por el servidor, y que lo impone la clave primaria de `acciones_criticas`**. Esa tabla ya no
 * > existe: se borró vacía (V62 del backend) y las acciones viven en el objetivo diario desde la
 * > V61. El campo **sigue llegando, siempre `[]`**, y a propósito: esta app no tiene actualización
 * > por aire, así que el servidor lo manda hasta que todos los builds instalados sean de hoy en
 * > adelante. Queda opcional acá porque ya no significa nada — no se lee en ninguna pantalla.
 *
 * Los campos de cierre (`autoevaluacionFin`, `bloqueoPrincipal`, `correccion`) vienen en `null`
 * mientras la semana sigue abierta. Es el dato que distingue "planificada" de "cerrada".
 */
export interface RocaSemanalApi {
  id: string;
  rocaMaestraId: string;
  numeroSemana: number;
  titulo: string;
  accionesCriticas?: string[];
  obstaculo: string | null;
  contingencia: string | null;
  autoevaluacionInicio: number | null;
  autoevaluacionFin: number | null;
  bloqueoPrincipal: string | null;
  correccion: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * Un eje del plan semanal, tal como lo pide `POST /api/v1/rocks/weekly`.
 *
 * > **Corregido el 2026-09-23.** Acá se documentaba una asimetría del contrato —alta con
 * > `accionCritica1..3` sueltos, edición con `accionesCriticas: string[]`— y se pedía respetarla.
 * > Dejó de existir: los dos endpoints perdieron sus campos de acciones cuando la tabla se borró
 * > (V62). La semana manda su objetivo y nada más; las acciones se escriben al planificar el día
 * > (`ItemPlanDiario.acciones`), que es cuando la persona sabe con qué cuenta.
 */
export interface ItemPlanSemanal {
  eje: EjeObjetivo;
  titulo: string;
  obstaculo?: string;
  contingencia?: string;
  /** 1 a 10. Cuánto se ve capaz de cumplirla al empezar la semana. */
  autoevaluacionInicio?: number;
}

/** Cuerpo de `PATCH /api/v1/rocks/weekly/{id}`. Lo que va en `null`/ausente no se toca. */
export interface EdicionRocaSemanal {
  titulo?: string;
  obstaculo?: string;
  contingencia?: string;
  autoevaluacionInicio?: number;
}

/** Cuerpo de `PATCH /api/v1/rocks/weekly/{id}/review`. Los tres son obligatorios al cerrar. */
export interface CierreRocaSemanal {
  autoevaluacionFin: number;
  bloqueoPrincipal: string;
  correccion: string;
}

/* ------------------------------------------------------------------------------------------------
 * Nivel diario — `rocks/.../rest/rocadiaria`
 * ---------------------------------------------------------------------------------------------- */

/**
 * El color no es decoración: es la regla de Pareto. La VERDE de cada eje es la que más mueve la
 * aguja, y hasta que no tiene evidencia, la AMARILLA y la ROJA de ese eje llegan con
 * `bloqueada: true`. Sale de la posición (1→VERDE, 2→AMARILLA, 3→ROJA), no se elige.
 */
export type ColorPareto = 'VERDE' | 'AMARILLA' | 'ROJA';

/** `RocaDiariaResponse` del backend. */
export interface RocaDiariaApi {
  id: string;
  fecha: string;
  posicion: number;
  titulo: string;
  descripcion: string | null;
  color: ColorPareto;
  puntajeImpacto: number;
  esDelegable: boolean;
  eje: EjeObjetivo;
  rocaSemanalId: string | null;
  /** `HH:mm:ss` local, o `null` si la acción no se agendó a una hora. */
  horaInicio: string | null;
  horaFin: string | null;
  completada: boolean;
  completadaEn: string | null;
  puntosOtorgados: number;
  bloqueada: boolean;
  /** Con qué se logra este objetivo del día, en orden. Vacío = sin desglose. */
  acciones: string[];
}

/**
 * Una acción a agendar, tal como la pide `POST /api/v1/rocks/plan`.
 *
 * `posicion` tiene que empezar en 1 y no dejar huecos **dentro de cada eje** (1 a 3 rocas por eje):
 * mandar solo la posición 2 da 400. La pantalla numera por orden de la lista, no deja elegirla.
 */
export interface ItemPlanDiario {
  eje: EjeObjetivo;
  posicion: number;
  titulo: string;
  descripcion?: string;
  /** 1 a 10. Fuera de rango, 400. */
  puntajeImpacto: number;
  esDelegable: boolean;
  /** `HH:mm`. Opcional: una acción puede no tener hora, igual que un hábito. */
  horaInicio?: string;
  horaFin?: string;
  /**
   * Con qué se logra este objetivo del día: hasta tres, opcionales.
   *
   * Es el nivel donde ahora viven las acciones (V61). Antes se escribían el domingo colgando de la
   * semana, sin saber todavía qué día se iban a hacer. Vacío es válido: un objetivo puede ser una
   * sola cosa que no necesita desglose.
   */
  acciones?: string[];
}
