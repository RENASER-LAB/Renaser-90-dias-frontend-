import { leerCuota, type CuotaDePago } from '../../../pagos/api/pagosSchemas';
import { esMoneda, type Moneda } from '../../../pagos/utils/dinero';
import { aIso, fechaEnPalabrasDePago, hoyDelTelefono, type FechaDePago } from '../../../pagos/utils/fechasDePago';
import type { AcuerdoAceptadoApi, AcuerdoApi } from '../api/terminosSchemas';

/**
 * «Mi aceptación» del Acuerdo de transformación (spec 039, D-312), sin React: lo que dice el bloque que va al final de los términos, antes de firmar, y la sección
 * «Mi cronograma de pagos» de quien entra con cronograma. **Lo llena el sistema**, no una IA ni la persona: el nombre completo, el programa y las fechas llegan ya
 * resueltos del servidor (la regla de «mañana» de la spec 036 y el último día del programa son suyas); la app solo los escribe. Nada se calcula aquí, salvo «hoy» para la
 * fecha de aceptación, que es la del teléfono —las alarmas y los recordatorios de la app ya usan ese «hoy»—; la hora que queda guardada es la del servidor.
 */

export const TITULO_DE_MI_ACEPTACION = 'Mi aceptación';
/** Las dos frases fijas del dueño (2026-11-02). */
export const FRASE_DE_LA_DECISION = 'He decidido formar parte de RENASER, consciente de mi compromiso con este proceso de transformación.';
export const FRASE_DE_LA_DECLARACION = 'Declaro que he leído, comprendido y aceptado los términos y condiciones del programa al que ingreso.';

export const TITULO_DEL_CRONOGRAMA_A_FIRMAR = 'Mi cronograma de pagos';
export const DETALLE_DEL_CRONOGRAMA_A_FIRMAR = 'Revisa las fechas y los montos acordados.';
/** La frase de la cláusula 19 que acompaña a su casilla. */
export const FRASE_DEL_CRONOGRAMA = 'Acepto el cronograma de pagos registrado en NASER y me comprometo a cumplirlo.';
export const TITULO_DE_CRONOGRAMA_FALTA = 'Cronograma por aceptar';
export const MENSAJE_DE_CRONOGRAMA_FALTA = 'Marca que aceptas el cronograma de pagos para continuar.';
export const ERROR_DE_CRONOGRAMA_FALTA = 'Marca esta casilla para continuar.';

/** El cronograma a firmar: la moneda, las cuotas y la huella que el servidor compara al firmar. */
export type CronogramaParaFirmar = { moneda: Moneda | null; cuotas: CuotaDePago[]; huella: string };

export type AcuerdoDeLaPersona = {
  participante: string;
  programa: string;
  /** `AAAA-MM-DD`, o `null` si no hay un programa que prometerle (el personal que no activó el suyo). */
  inicio: string | null;
  fin: string | null;
  /** Si ya activó su programa (vuelve a aceptar un texto nuevo): sus fechas son las reales. */
  empezado: boolean;
  cronograma: CronogramaParaFirmar | null;
};

const limpio = (valor: string | null | undefined): string => valor?.trim() ?? '';

/** «Mi aceptación» tal como llega del servidor; `null` si no llegó (un servidor anterior) o no se entiende: entonces no se dibuja nada. */
export function leerAcuerdo(api: AcuerdoApi | null | undefined): AcuerdoDeLaPersona | null {
  if (!api) return null;
  const programa = limpio(api.program);
  if (programa === '') return null;
  const cuotas = (api.schedule?.installments ?? []).flatMap(cruda => {
    const cuota = leerCuota(cruda);
    return cuota ? [cuota] : [];
  });
  return {
    participante: limpio(api.participantName),
    programa,
    inicio: limpio(api.startDate) || null,
    fin: limpio(api.endDate) || null,
    empezado: api.started,
    /* Sin una sola cuota entendible no hay cronograma que firmar: se pediría aceptar algo en blanco. */
    cronograma: api.schedule && cuotas.length > 0
      ? { moneda: esMoneda(api.schedule.currency) ? api.schedule.currency : null, cuotas, huella: api.schedule.fingerprint }
      : null,
  };
}

export type LineaDeMiAceptacion = { clave: 'participante' | 'programa' | 'inicio' | 'fin' | 'aceptacion'; etiqueta: string; valor: string };

/**
 * Las líneas del bloque, en el orden del dueño: participante, programa, fecha de inicio, fecha de finalización y fecha de aceptación (la firma es el recuadro de
 * abajo). Sin fechas de programa no se escriben las dos del medio; sin nombre, tampoco la primera: nunca un «—» que parezca un dato.
 */
export function lineasDeMiAceptacion(acuerdo: AcuerdoDeLaPersona, hoy: FechaDePago = hoyDelTelefono()): LineaDeMiAceptacion[] {
  const lineas: LineaDeMiAceptacion[] = [];
  if (acuerdo.participante !== '') lineas.push({ clave: 'participante', etiqueta: 'Participante', valor: acuerdo.participante });
  lineas.push({ clave: 'programa', etiqueta: 'Programa', valor: acuerdo.programa });
  if (acuerdo.inicio) lineas.push({ clave: 'inicio', etiqueta: 'Fecha de inicio', valor: fechaEnPalabrasDePago(acuerdo.inicio) });
  if (acuerdo.fin) lineas.push({ clave: 'fin', etiqueta: 'Fecha de finalización', valor: fechaEnPalabrasDePago(acuerdo.fin) });
  lineas.push({ clave: 'aceptacion', etiqueta: 'Fecha de aceptación', valor: fechaEnPalabrasDePago(aIso(hoy)) });
  return lineas;
}

/** Lo que se lee en voz alta del bloque: las dos frases y cada línea como «Programa: Formación RENASER · 90 días». */
export function textoParaElLector(acuerdo: AcuerdoDeLaPersona, hoy?: FechaDePago): string {
  const lineas = lineasDeMiAceptacion(acuerdo, hoy).map(l => `${l.etiqueta}: ${l.valor}`);
  return [TITULO_DE_MI_ACEPTACION, FRASE_DE_LA_DECISION, FRASE_DE_LA_DECLARACION, ...lineas].join('. ');
}

/** Lo que dice «releer lo que acepté» de lo que se le mostró: «Formación RENASER · 90 días», «Del 3 de noviembre de 2026 al 31 de enero de 2027». */
export function resumenDeLoAceptado(aceptado: AcuerdoAceptadoApi | null | undefined): { programa: string | null; periodo: string | null; cronogramaFirmado: boolean } | null {
  if (!aceptado) return null;
  const programa = limpio(aceptado.program) || null;
  const inicio = limpio(aceptado.startDate);
  const fin = limpio(aceptado.endDate);
  const periodo = inicio && fin ? `Del ${fechaEnPalabrasDePago(inicio)} al ${fechaEnPalabrasDePago(fin)}` : null;
  if (!programa && !periodo && !aceptado.scheduleSigned) return null;
  return { programa, periodo, cronogramaFirmado: aceptado.scheduleSigned };
}
