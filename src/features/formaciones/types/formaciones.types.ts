/**
 * Las formaciones de Renaser (spec 022 del backend): Escuela, Diplomado y Certificación, aisladas entre sí. Estos tipos espejan
 * lo que manda el servidor; la app NO decide quién ve qué (eso lo filtra el servidor en cada lectura), solo lo muestra.
 */

/** Las tres formaciones fijas. Un código que esta versión no conoce no rompe nada: se trata como un texto cualquiera. */
export const CODIGOS_DE_FORMACION = ['ESCUELA', 'DIPLOMADO', 'CERTIFICACION'] as const;

export type CodigoDeFormacion = (typeof CODIGOS_DE_FORMACION)[number];

/** La formación de toda persona que no dice otra (lo existente antes de las formaciones, y un backend anterior). */
export const FORMACION_POR_DEFECTO: CodigoDeFormacion = 'ESCUELA';

/** Los días de un programa sin otra duración: la Escuela y el «3 meses» del Diplomado. */
export const DURACION_POR_DEFECTO = 90;

export type OpcionDeFormacion = { codigo: string; nombre: string };

/** Una fase del programa de esta persona, ya estirada a su duración (en un año, la Fase II va del día 29 al 137). */
export type FaseDeLaFormacion = { numero: number; primerDia: number; ultimoDia: number };

/**
 * La formación de la sesión (`GET /api/v1/me/formacion` y el campo `formacion` de `/auth/me` y del login).
 * - Aprendiz: `activa` es la suya, sin selector. Personal con varias: `puedeElegir` y una activa. Sin ninguna: `sinFormacion`.
 * - Administración, Alquimista y Soporte TI: `veTodas`, sin una activa.
 */
export type FormacionDeLaSesion = {
  activa: OpcionDeFormacion | null;
  disponibles: OpcionDeFormacion[];
  puedeElegir: boolean;
  veTodas: boolean;
  sinFormacion: boolean;
  duracionDias: number;
  fases: FaseDeLaFormacion[];
};

/** Una formación en el centro de Administración. */
export type ResumenDeFormacion = {
  codigo: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  duracionesDias: number[];
  etiquetasDeDuracion: string[];
  version: number;
};

export type TarjetaDeFormacion = {
  resumen: ResumenDeFormacion;
  aprendicesActivos: number;
  personal: number;
  grupos: number;
  porAtender: number;
};

export type DetalleDeFormacion = {
  resumen: ResumenDeFormacion;
  personas: { aprendices: number; porEmpezar: number; enCurso: number; terminaron: number; personal: number };
  grupos: { total: number; conMentor: number; sinMentor: number; recepcion: number };
  porAtender: { gruposSinMentor: number; aprendicesSinGrupo: number; personalSinFormacion: number };
};

export type ParticipacionAnterior = {
  formacion: string;
  duracionDias: number;
  fechaInicio: string | null;
  fechaFin: string;
  diaFinal: number;
  resultado: 'TERMINADA' | 'DADA_POR_TERMINADA' | string;
  motivo: string | null;
  puntosLiga: number | null;
  trasladadoA: string;
};

/** La formación de una persona vista desde Administración (su ficha). */
export type FormacionDeUnaPersona = {
  formacion: string | null;
  duracionDias: number;
  programaActivado: boolean;
  formacionesDelPersonal: Array<{ formacion: string; activa: boolean }>;
  historial: ParticipacionAnterior[];
};

export type DatosParaGuardarFormacion = {
  nombre: string;
  descripcion: string;
  activa: boolean;
  duracionesDias: number[];
  version: number;
};

export type DatosDeTraslado = {
  formacion: string;
  duracionDias: number;
  darPorTerminada: boolean;
  motivo: string | null;
};

/** Los cuatro tipos de comunidad que cada formación puede prender o apagar (spec 024). */
export const TIPOS_DE_COMUNIDAD = ['GENERAL', 'GRUPO', 'SOPORTE', 'DIRECTO'] as const;

export type TipoDeComunidad = (typeof TIPOS_DE_COMUNIDAD)[number];

/** Un tipo de comunidad de una formación: si está prendido y cuántas conversaciones esconde si se apaga. */
export type TipoDeComunidadDeLaFormacion = {
  tipo: TipoDeComunidad;
  prendido: boolean;
  conversaciones: number;
};

/** `GET /api/v1/admin/formaciones/{codigo}/comunidad`. */
export type ComunidadDeLaFormacion = {
  formacion: string;
  tipos: TipoDeComunidadDeLaFormacion[];
};
