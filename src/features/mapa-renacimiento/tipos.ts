/**
 * Mapa de Renacimiento — Día 7. Modelo del cliente, calcado del "Manual Técnico de
 * Implementación · Onboarding · Día 7" (v1.0, septiembre 2026), §5.1 "Entidades mínimas".
 *
 * Es el modelo de PANTALLA y de borrador local. El backend todavía no tiene estas entidades
 * (`day7_map`, `goal`, `lead_action`, `replacement_protocol`, `milestone`, `return_protocol`,
 * `map_version` del manual): ver `docs/MAPA_RENACIMIENTO_DIA7.md` para el contrato que falta.
 */

import type { EjeObjetivo } from '../objetivos/types/objetivos.types';

export type Area = 'salud' | 'negocio_dinero' | 'relaciones';
export const AREAS: readonly Area[] = ['salud', 'negocio_dinero', 'relaciones'] as const;

export type TipoResultadoSalud =
  | 'peso' | 'medidas' | 'energia' | 'fuerza' | 'resistencia' | 'sueno' | 'condicion_clinica' | 'otro';
export type TipoResultadoNegocio =
  | 'facturacion' | 'utilidad' | 'ventas' | 'clientes' | 'ahorro' | 'deuda' | 'ingreso_personal' | 'otro';
export type Vinculo = 'pareja' | 'hijos' | 'padres' | 'familia' | 'socios' | 'equipo' | 'amistades' | 'otro';
export type PeriodoMedicion = 'semanal' | 'mensual' | 'acumulado_dia_90';
export type EvidenciaAccion = 'check' | 'foto' | 'video' | 'registro' | 'documento' | 'otro';
export type BloqueDia = 'manana' | 'tarde' | 'noche';
export type DiaSemana = 'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D';
export type DiaHito = 30 | 60 | 90;

/** §4.3 del manual. Los que bloquean impiden "Continuar"; los demás solo avisan. */
export type CodigoCalidad =
  | 'MISSING_BASELINE' | 'MISSING_TARGET' | 'VAGUE_RESULT' | 'MISSING_EVIDENCE'
  | 'THIRD_PARTY_CONTROL' | 'UNSAFE_HEALTH' | 'UNIT_MISMATCH' | 'UNREALISTIC_LOAD'
  // Agregados el 2026-09-09. Los tres usaban MISSING_TARGET —"¿A qué número concreto quieres
  // llegar?"— aunque lo que faltaba no era un número: era el tipo de resultado, el periodo o el
  // vínculo. El aviso señalaba un campo que estaba bien lleno y se perdían minutos buscando el
  // error donde no estaba. Cada cosa que falta necesita su propio código, o el mensaje miente.
  | 'MISSING_TYPE' | 'MISSING_PERIOD' | 'MISSING_LINK';

export interface AvisoCalidad {
  codigo: CodigoCalidad;
  mensaje: string;
  bloquea: boolean;
}

interface ObjetivoBase {
  evidencia: string;
  motivo: string;
  /** La redacción SMART (§4). La escribe el sistema; la persona la edita o la confirma. */
  metaRedactada: string;
  /** Si la persona la tocó, no se vuelve a regenerar sola al cambiar un campo. */
  metaEditadaAMano: boolean;
}

export interface ObjetivoSalud extends ObjetivoBase {
  area: 'salud';
  tipoResultado: TipoResultadoSalud | null;
  lineaBase: string;
  resultadoDia90: string;
  unidad: string;
}

export interface ObjetivoNegocio extends ObjetivoBase {
  area: 'negocio_dinero';
  tipoResultado: TipoResultadoNegocio | null;
  lineaBase: string;
  resultadoDia90: string;
  moneda: string;
  periodo: PeriodoMedicion | null;
}

export interface ObjetivoRelaciones extends ObjetivoBase {
  area: 'relaciones';
  vinculo: Vinculo | null;
  situacionActual: number | null;
  resultadoDia90: number | null;
  /** Conducta PROPIA, no control de terceros (§3 V05). */
  cambioObservable: string;
}

export type Objetivo = ObjetivoSalud | ObjetivoNegocio | ObjetivoRelaciones;

export interface AccionMotora {
  id: string;
  area: Area;
  /** Verbo + objeto, 5–100 caracteres. */
  texto: string;
  frecuenciaSemanal: number;
  dias: DiaSemana[];
  momento: BloqueDia | null;
  evidencia: EvidenciaAccion | null;
}

export interface ProtocoloReemplazo {
  id: string;
  /** Clave del catálogo de V07, o el texto libre si eligió "otro". */
  patron: string;
  disparador: string;
  conductaActual: string;
  /** Acción de 2–30 minutos, ejecutable de inmediato. */
  respuestaAlternativa: string;
}

export interface Hito {
  area: Area;
  dia: DiaHito;
  valor: string;
}

export type EstadoMapa = 'no_iniciado' | 'en_progreso' | 'listo_para_revision' | 'activo';

/** V01–V10 son pasos 1–10; V11 (cierre) es el 11 y no cuenta en el "Paso X de 10". */
export type PasoMapa = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export const ULTIMO_PASO_CONTADO = 10;

export interface MapaRenacimiento {
  version: 1;
  estado: EstadoMapa;
  pasoActual: PasoMapa;
  prioridad: Area | null;
  salud: ObjetivoSalud;
  negocio: ObjetivoNegocio;
  relaciones: ObjetivoRelaciones;
  acciones: AccionMotora[];
  reemplazos: ProtocoloReemplazo[];
  hitos: Hito[];
  /** Protocolo de retorno (V09): la acción mínima para volver en menos de 24 h. */
  retorno: string;
  /** Pedido del dueño (§2, "limitaciones o riesgos"): compromiso de reportar y ser mentoreado. */
  compromisoSeguimiento: boolean;
  iniciadoEn: string | null;
  activadoEn: string | null;
  /**
   * `accionId -> habitId` de los hábitos ya creados al activar. Es lo que hace idempotente la
   * activación (AC-07): tocar "Activar" dos veces no crea dos veces el mismo hábito.
   */
  habitosCreados: Record<string, string>;
  actualizadoEn: string;
}

export function objetivoSaludVacio(): ObjetivoSalud {
  return {
    area: 'salud', tipoResultado: null, lineaBase: '', resultadoDia90: '', unidad: 'kg',
    evidencia: '', motivo: '', metaRedactada: '', metaEditadaAMano: false,
  };
}

export function objetivoNegocioVacio(): ObjetivoNegocio {
  return {
    area: 'negocio_dinero', tipoResultado: null, lineaBase: '', resultadoDia90: '', moneda: 'S/',
    periodo: null, evidencia: '', motivo: '', metaRedactada: '', metaEditadaAMano: false,
  };
}

export function objetivoRelacionesVacio(): ObjetivoRelaciones {
  return {
    area: 'relaciones', vinculo: null, situacionActual: null, resultadoDia90: null, cambioObservable: '',
    evidencia: '', motivo: '', metaRedactada: '', metaEditadaAMano: false,
  };
}

export function mapaVacio(): MapaRenacimiento {
  return {
    version: 1,
    estado: 'no_iniciado',
    pasoActual: 1,
    prioridad: null,
    salud: objetivoSaludVacio(),
    negocio: objetivoNegocioVacio(),
    relaciones: objetivoRelacionesVacio(),
    acciones: [],
    reemplazos: [],
    hitos: [],
    retorno: '',
    compromisoSeguimiento: false,
    iniciadoEn: null,
    activadoEn: null,
    habitosCreados: {},
    actualizadoEn: new Date().toISOString(),
  };
}

export function objetivoDe(mapa: MapaRenacimiento, area: Area): Objetivo {
  if (area === 'salud') return mapa.salud;
  if (area === 'negocio_dinero') return mapa.negocio;
  return mapa.relaciones;
}

/**
 * El eje de Rocas al que corresponde cada área del Mapa. Traducción 1 a 1 entre los dos únicos
 * vocabularios que conviven acá: el Mapa habla de áreas (`salud`, `negocio_dinero`, `relaciones`)
 * y el módulo de Rocas habla de ejes (`CUERPO`, `TRABAJO`, `RELACIONES`).
 *
 * **Vive en este archivo y no en `hooks/useMapaRenacimiento.ts`, donde estaba.** Importarla desde
 * ahí arrastraba el hook entero y, con él, `almacen.ts` y AsyncStorage — un módulo nativo que no
 * existe fuera de la app. La consecuencia concreta: cualquier test que necesitara solo esta tabla
 * de traducción reventaba al importarla. Un `Record` de tres entradas no tiene por qué obligar a
 * cargar el almacenamiento del dispositivo.
 */
export const EJE_POR_AREA: Record<Area, EjeObjetivo> = {
  salud: 'CUERPO',
  negocio_dinero: 'TRABAJO',
  relaciones: 'RELACIONES',
};

