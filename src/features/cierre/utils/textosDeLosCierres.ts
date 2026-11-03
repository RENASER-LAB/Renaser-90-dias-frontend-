import { diaCorto, rangoDeLaSemana } from '../../huecos/utils/textosDeHuecos';
import { textoCortoDelMotivo, textoCortoDelPlan, textoDelMotivo, textoDelPlan } from '../data/textosDelCierre';
import type { DiaDelCierre, MotivoQueSeRepite, ResumenDeLosCierres } from '../types/cierre.types';

/**
 * Los textos de la sección «Cierres del día» de las fichas (spec 017), en tipo oración y con tuteo de la app. Todo
 * puro. Las fechas se arman como las del tiempo libre (`diaCorto`, `rangoDeLaSemana`): son fechas de calendario.
 */

export { diaCorto, rangoDeLaSemana };

export const TITULO_DE_LA_SECCION = 'Cierres del día';
export const TEXTO_SIN_DIAS = 'No hay días para mostrar en esta semana.';
export const TEXTO_SIN_CIERRE_AUN = 'Hoy, todavía sin cerrar';

/** «3 cerrados · 1 sin cerrar». `null` si el servidor no mandó ninguna de las dos cifras. */
export function lineaDelResumen(resumen: Pick<ResumenDeLosCierres, 'cerrados' | 'sinCerrar'>): string | null {
  const { cerrados, sinCerrar } = resumen;
  if (cerrados === null && sinCerrar === null) return null;
  const partes: string[] = [];
  if (cerrados !== null) partes.push(`${cerrados} ${cerrados === 1 ? 'cerrado' : 'cerrados'}`);
  if (sinCerrar !== null) partes.push(`${sinCerrar} sin cerrar`);
  return partes.join(' · ');
}

/** «Tiempo · 4 veces». Un motivo que esta versión no conoce no se dibuja. */
export function lineaDeUnMotivo(motivo: MotivoQueSeRepite): string | null {
  const texto = textoCortoDelMotivo(motivo.motivo);
  if (!texto) return null;
  return `${texto} · ${motivo.veces} ${motivo.veces === 1 ? 'vez' : 'veces'}`;
}

/** Cómo quedó ese día, en palabras: «Cerrado», «Sin cerrar», «Hoy, todavía sin cerrar». `null` si no se sabe. */
export function estadoEnPalabras(dia: Pick<DiaDelCierre, 'estado'>): string | null {
  switch (dia.estado) {
    case 'CERRADO':
      return 'Cerrado';
    case 'SIN_CERRAR':
      return 'Sin cerrar';
    case 'ABIERTO':
      return TEXTO_SIN_CIERRE_AUN;
    default:
      return null;
  }
}

/** «Jueves 29 · Cerrado». */
export function encabezadoDelDia(dia: Pick<DiaDelCierre, 'fecha' | 'estado'>): string {
  const estado = estadoEnPalabras(dia);
  return estado ? `${diaCorto(dia.fecha)} · ${estado}` : diaCorto(dia.fecha);
}

/** «Tiempo → Otra hora»; si falta una de las dos mitades, la que se entiende. Es lo que se ve (los textos cortos de los chips). */
export function respuestaEnPalabras(cierre: { motivo: string | null; manana: string | null }): string | null {
  const motivo = textoCortoDelMotivo(cierre.motivo);
  const plan = textoCortoDelPlan(cierre.manana);
  if (motivo && plan) return `${motivo} → ${plan}`;
  return motivo ?? plan;
}

/**
 * Lo mismo, con los textos completos de siempre, para el lector de pantalla: «No me alcanzó el tiempo, Hacerla a otra hora».
 * Lo que se ve es corto y lleva íconos; lo que se oye dice la frase entera.
 */
export function respuestaParaElLector(cierre: { motivo: string | null; manana: string | null }): string | null {
  const partes = [textoDelMotivo(cierre.motivo), textoDelPlan(cierre.manana)].filter((p): p is string => p !== null);
  return partes.length > 0 ? partes.join(', ') : null;
}
