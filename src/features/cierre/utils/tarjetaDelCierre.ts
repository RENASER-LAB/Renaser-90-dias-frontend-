import { planEnFrase } from '../data/textosDelCierre';
import type { CierreDelDia } from '../types/cierre.types';
import { pendientesDe } from './borradorDelCierre';

/**
 * Los textos de la tarjeta «Cierra tu día» de Plan (spec 017, movida a Plan por la spec 033). Todo puro.
 *
 * **La tarjeta no lleva hora** (pedido del dueño, 2026-10-30): quien trabaja de noche no tiene una hora «normal» de dormir y
 * el cierre es de todos los días. Lo único que se sabe de un cierre ya hecho es CUÁNDO se hizo (`cerradoA`), y eso se dice en
 * su texto.
 */

export const TITULO_DEL_CIERRE = 'Cierra tu día';
export const TITULO_DEL_DIA_CERRADO = 'Día cerrado';
export const DURACION_DEL_CIERRE = '2 minutos';
/** La segunda línea de la tarjeta sin cerrar: cuánto toma y que no pesa en nada. */
export const TEXTO_DE_LO_OPCIONAL = `${DURACION_DEL_CIERRE} · opcional, no da puntos`;

function dosCifras(n: number): string {
  return String(n).padStart(2, '0');
}

/** `HH:mm` en la hora del teléfono de un instante ISO, o `null`. */
export function horaDeUnInstante(instanteIso: string | null | undefined): string | null {
  if (!instanteIso) return null;
  const fecha = new Date(instanteIso);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${dosCifras(fecha.getHours())}:${dosCifras(fecha.getMinutes())}`;
}

/**
 * Lo que dijo para mañana, en una línea: «Mañana: «Revisar las facturas» a otra hora» (una sola) o
 * «Mañana: «Revisar las facturas» a otra hora y 1 más». `null` si no dejó ninguna pendiente con respuesta.
 */
export function lineaDeManana(vista: Pick<CierreDelDia, 'acciones'>): string | null {
  const conPlan = pendientesDe(vista).flatMap(a => {
    const plan = planEnFrase(a.cierre?.manana);
    return plan ? [{ titulo: a.titulo, plan }] : [];
  });
  if (conPlan.length === 0) return null;
  const [primera, ...resto] = conPlan;
  const base = `Mañana: «${primera.titulo}» ${primera.plan}`;
  return resto.length === 0 ? base : `${base} y ${resto.length} más`;
}

export interface TextosDeLaTarjeta {
  cerrado: boolean;
  /** «Cierra tu día» o «Día cerrado». */
  titulo: string;
  /** Sin cerrar: «2 minutos · opcional, no da puntos». Cerrado: lo de mañana, o «Cerrado a las 21:40». */
  segundaLinea: string | null;
}

/** Lo que dice la tarjeta de HOY según cómo está el cierre. */
export function textosDeLaTarjeta(vista: CierreDelDia): TextosDeLaTarjeta {
  const cerrado = vista.estado === 'CERRADO';
  if (!cerrado) return { cerrado, titulo: TITULO_DEL_CIERRE, segundaLinea: TEXTO_DE_LO_OPCIONAL };
  const hora = horaDeUnInstante(vista.cerradoEn);
  return {
    cerrado,
    titulo: TITULO_DEL_DIA_CERRADO,
    segundaLinea: lineaDeManana(vista) ?? (hora ? `Cerrado a las ${hora}` : null),
  };
}
