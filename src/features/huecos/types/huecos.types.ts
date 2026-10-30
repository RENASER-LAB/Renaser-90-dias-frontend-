/**
 * Los huecos de horario de una persona (spec 015, primera versión): lo que se lee de
 * `GET /api/v1/mentor/groups/{g}/learners/{u}/huecos` y `GET /api/v1/leadership/groups/{g}/people/{p}/huecos`.
 *
 * Solo lo ve su acompañamiento, en la ficha y en solo lectura. Las horas llegan como `HH:mm` en la zona de la persona;
 * la app no las convierte ni recalcula nada.
 */

/** Un tramo libre de 30 minutos o más, dentro de la ventana del día. */
export interface HuecoDelDia {
  /** `HH:mm`. */
  desde: string;
  /** `HH:mm` (puede ser `24:00` en un día sin ventana). */
  hasta: string;
  minutos: number;
}

/** De cuándo a cuándo cuenta el día: de Despertar a Dormir. */
export interface VentanaDelDia {
  desde: string;
  hasta: string;
}

/**
 * De dónde sale un bloque ocupado. `AGENDA` son las horas que la persona dijo estar ocupada y no llevan nombre. `OTRO`
 * es un tipo que esta versión de la app todavía no conoce: se dibuja igual, como un bloque más.
 */
export type TipoDeOcupado = 'HABITO' | 'ACCION' | 'EVENTO' | 'AGENDA' | 'OTRO';

/** Un pedazo ocupado de la agenda de un día, dentro de su ventana. Los que se cruzan vienen separados. */
export interface BloqueOcupado {
  /** `HH:mm`. */
  desde: string;
  hasta: string;
  tipo: TipoDeOcupado;
  /** El nombre del hábito, la acción o el evento; `null` en la agenda personal (y en lo que no tiene nombre). */
  titulo: string | null;
}

/** Por qué un día cuenta entero en vez de ir de Despertar a Dormir. */
export type SinVentanaPor =
  | 'SIN_DESPERTAR'
  | 'SIN_DORMIR'
  | 'SIN_DESPERTAR_NI_DORMIR'
  | 'DORMIR_ANTES_DE_DESPERTAR';

export interface DiaConHuecos {
  /** `yyyy-MM-dd`. */
  fecha: string;
  /** `null`: ese día no hay Despertar ni Dormir y el día cuenta entero (00:00 a 24:00). */
  ventana: VentanaDelDia | null;
  minutosOcupados: number | null;
  minutosLibres: number | null;
  huecos: HuecoDelDia[];
  /** Por qué no hay ventana; `null` si la hay, y también en un día de una semana cerrada (la foto no lo guarda). */
  sinVentanaPor: SinVentanaPor | null;
  /**
   * La agenda del día, bloque por bloque y en orden de hora. **`null` = el servidor no la dice** (un día de una semana
   * cerrada, cuya foto guarda tiempo y no nombres, o un backend anterior); `[]` = ese día no hay nada planificado.
   */
  ocupados: BloqueOcupado[] | null;
  /** Hábitos y acciones de ese día cumplidos a tiempo, tarde y sin cumplir; `null` si el servidor no los dice. */
  cumplidosATiempo: number | null;
  cumplidosTarde: number | null;
  noCumplidos: number | null;
}

/** Un tramo que queda libre en varios días de la semana. `dias` en ISO: lunes = 1 … domingo = 7. */
export interface HuecoQueSeRepite {
  desde: string;
  hasta: string;
  dias: number[];
}

export interface ResumenDeHuecos {
  minutosOcupados: number | null;
  minutosLibres: number | null;
  huecosQueSeRepiten: HuecoQueSeRepite[];
  cumplidosATiempo: number | null;
  cumplidosTarde: number | null;
  noCumplidos: number | null;
}

export interface HuecosDeLaSemana {
  /** El lunes de la semana (`yyyy-MM-dd`). */
  semana: string;
  /** El lunes de la primera semana de su programa; `null` si el servidor no lo dice. Es el tope de ‹. */
  primeraSemana: string | null;
  /** Hoy, en la zona de la persona (`yyyy-MM-dd`); `null` si el servidor no lo dice. La app no lo calcula con su reloj. */
  hoy: string | null;
  /** `true`: sale de la foto guardada al cerrar la semana. `false`: la semana en curso, calculada al pedirla. */
  cerrada: boolean;
  /** Los siete días de lunes a domingo (los que se entienden, en orden). */
  dias: DiaConHuecos[];
  /** `null` si el servidor no mandó el resumen: la sección dibuja solo los días. */
  resumen: ResumenDeHuecos | null;
}

/**
 * Cómo pide una ficha una semana. `null` o sin valor = la semana en curso de la persona. Cada ficha pasa la suya
 * (el mentor, la ruta de `/mentor/…`; el líder, el administrador y el alquimista, la de `/leadership/…`) y la sección
 * no sabe de rutas ni de roles. **Tiene que ser estable** (un `useMemo` por persona): es la llave de lo que se guarda
 * mientras la ficha está abierta.
 */
export type CargarHuecos = (semana?: string | null) => Promise<HuecosDeLaSemana>;
