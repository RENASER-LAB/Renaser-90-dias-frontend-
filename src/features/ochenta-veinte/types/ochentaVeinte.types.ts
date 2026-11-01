/**
 * El 80/20 de las acciones del día y el análisis con IA de una semana o un mes del programa (spec 031, D-306). Los tipos son la
 * forma que la app usa por dentro; lo que llega del servidor se valida y se normaliza en `api/ochentaVeinteSchemas.ts`.
 */

export type TipoDePeriodo = 'SEMANA' | 'MES';

/**
 * Cómo está el periodo: `EN_CURSO` (no cerró: solo cifras), `LISTO` (el análisis está), `PENDIENTE` (cerró y el análisis llega pronto),
 * `SIN_DATOS` (no alcanzó el mínimo; ver `falta`) o `SIN_ANALISIS` (la IA no pudo).
 */
export type EstadoDelPeriodo = 'EN_CURSO' | 'LISTO' | 'PENDIENTE' | 'SIN_DATOS' | 'SIN_ANALISIS';

/** `ACCIONES`: faltaron acciones planificadas; `DIAS`: estaban en muy pocos días. */
export type LoQueFalta = 'ACCIONES' | 'DIAS';

export type EjeDelOchentaVeinte = 'CUERPO' | 'TRABAJO' | 'RELACIONES';
export type ColorDeLaAccion = 'VERDE' | 'AMARILLA' | 'ROJA';

export interface AccionDelOchentaVeinte {
  eje: EjeDelOchentaVeinte | string;
  color: ColorDeLaAccion | string;
  impacto: number;
  fecha: string;
  titulo: string;
}

export interface CifrasDelEje {
  eje: EjeDelOchentaVeinte | string;
  planificadas: number;
  cumplidas: number;
  impactoCumplido: number;
  porcentajeDelImpacto: number | null;
}

/** Regla de las acciones verdes (031-1 A). */
export interface ReglaDeLasVerdes {
  planificadas: number;
  cumplidas: number;
  impactoCumplido: number;
  porcentajeDelImpacto: number | null;
}

/** Regla del 20 % de las cumplidas con más impacto (031-1 B). */
export interface ReglaDelVeintePorCiento {
  acciones: number;
  impacto: number;
  porcentajeDelImpacto: number | null;
}

export interface RepeticionDelCierre {
  clave: string;
  veces: number;
}

export interface ResumenDelCierre {
  diasCerrados: number;
  diasSinCerrar: number;
  motivos: RepeticionDelCierre[];
  planes: RepeticionDelCierre[];
}

export interface CifrasDelOchentaVeinte {
  desde: string;
  hasta: string;
  planificadas: number;
  cumplidas: number;
  diasConAcciones: number;
  porVenir: number;
  impactoPlanificado: number;
  impactoCumplido: number;
  porcentajeCumplidas: number | null;
  verdes: ReglaDeLasVerdes | null;
  veintePorCiento: ReglaDelVeintePorCiento | null;
  porEje: CifrasDelEje[];
  lasQueMasMovieron: AccionDelOchentaVeinte[];
  lasQueSeFueron: AccionDelOchentaVeinte[];
  cumplioLoQueMenosMovia: boolean;
  cierre: ResumenDelCierre | null;
}

export interface ResumenDeLaSemana {
  numero: number;
  planificadas: number;
  cumplidas: number;
  porcentajeCumplidas: number | null;
  porcentajeDelImpactoDeLasVerdes: number | null;
}

export interface EnergiaDelCodigoRenaser {
  respuestas: number;
  dictadas: number;
  energiaPromedio: number | null;
  energiaMinima: number | null;
  energiaMaxima: number | null;
  manana: number | null;
  tarde: number | null;
  noche: number | null;
}

/** Las cuatro partes del análisis, siempre en este orden. Texto de la IA sobre datos personales: no se loguea. */
export interface TextoDelAnalisis {
  loQueMasMovio: string;
  loQueSeTeFue: string;
  comoEstuviste: string;
  proximosPasos: string[];
}

export interface VistaDelPeriodo {
  tipo: TipoDePeriodo;
  numero: number;
  /** Primer día del periodo (`yyyy-MM-dd`): lo que se pide al servidor para volver a él. */
  inicio: string;
  fin: string;
  cerrado: boolean;
  /** El inicio del periodo anterior; `null` para el primero. */
  anterior: string | null;
  /** El inicio del siguiente; `null` si este es el actual. */
  siguiente: string | null;
  cifras: CifrasDelOchentaVeinte;
  semanas: ResumenDeLaSemana[];
  estado: EstadoDelPeriodo;
  falta: LoQueFalta[];
  minimoDeAcciones: number;
  codigoRenaser: EnergiaDelCodigoRenaser | null;
  analisis: TextoDelAnalisis | null;
  generadoEn: string | null;
}

/**
 * Lo que cada pantalla necesita para leer un periodo: de la persona o de alguien que ella acompaña. `inicio` en `null` = el periodo en
 * curso, que el servidor resuelve en la zona de la persona.
 */
export type CargarOchentaVeinte = (tipo: TipoDePeriodo, inicio: string | null) => Promise<VistaDelPeriodo>;
