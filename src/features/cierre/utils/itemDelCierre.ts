import type { ItemDelDia } from '../../training/utils/itemsDelDia';
import { planEnFrase } from '../data/textosDelCierre';
import type { CierreDelDia, DiaDelCierre } from '../types/cierre.types';
import { pendientesDe } from './borradorDelCierre';

/**
 * La fila «Cierra tu día» como un ítem más de la lista de Training (spec 017). Es un tipo aparte (`cierre`): la lista de
 * hoy lo dibuja de última, siempre, y no cuenta como hecho ni da puntos, no se atrasa y no se despide.
 *
 * **No lleva hora** (pedido del dueño, 2026-10-30): ni la de Dormir menos 30 minutos ni las 21:30 de antes. Quien trabaja
 * de noche no tiene una hora «normal» de dormir, y el cierre es de todos los días. `hora` es siempre `null`; lo único que
 * se sabe de un cierre ya hecho es CUÁNDO se hizo (`cerradoA`), y eso se dice en el texto, no en la columna de la hora.
 */

export const TITULO_DEL_CIERRE = 'Cierra tu día';
export const TITULO_DEL_DIA_CERRADO = 'Día cerrado';
export const DURACION_DEL_CIERRE = '2 minutos';

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

export interface DatosDeLaFilaDelCierre {
  /** `null` = el servidor no dijo el estado. */
  estado: DiaDelCierre['estado'];
  /** «Mañana: «Revisar las facturas» a otra hora», solo si ya cerró. */
  lineaDeManana: string | null;
  /** `HH:mm` en que se cerró por primera vez. */
  cerradoA: string | null;
}

/** El ítem de HOY: sin hora, cerrado o no. */
export function itemDelCierreDeHoy(hoyIso: string, vista: CierreDelDia): ItemDelDia {
  const cerrado = vista.estado === 'CERRADO';
  return {
    clave: `cierre-${hoyIso}`,
    tipo: 'cierre',
    titulo: cerrado ? TITULO_DEL_DIA_CERRADO : TITULO_DEL_CIERRE,
    hora: null,
    hecho: cerrado,
    icono: 'moon',
    dimension: null,
    puntos: null,
    guia: null,
    cierre: {
      estado: vista.estado,
      lineaDeManana: cerrado ? lineaDeManana(vista) : null,
      cerradoA: cerrado ? horaDeUnInstante(vista.cerradoEn) : null,
    },
  };
}

/**
 * El ítem de un día ANTERIOR (solo lectura): «Cerrado» o «Sin cerrar». Va de última, como en hoy: sin hora (cuándo se cerró,
 * si se cerró, lo dice `cerradoA` en su texto). Si el servidor no dijo cómo quedó ese día (o dijo que sigue abierto), no hay
 * fila: no se afirma lo que no se sabe.
 */
export function itemDelCierreDeUnDiaAnterior(fechaIso: string, vista: CierreDelDia): ItemDelDia | null {
  if (vista.estado !== 'CERRADO' && vista.estado !== 'SIN_CERRAR') return null;
  const cerrado = vista.estado === 'CERRADO';
  const cerradoA = cerrado ? horaDeUnInstante(vista.cerradoEn) : null;
  return {
    clave: `cierre-${fechaIso}`,
    tipo: 'cierre',
    titulo: cerrado ? TITULO_DEL_DIA_CERRADO : TITULO_DEL_CIERRE,
    hora: null,
    hecho: cerrado,
    icono: 'moon',
    dimension: null,
    puntos: null,
    guia: null,
    cierre: { estado: vista.estado, lineaDeManana: null, cerradoA },
  };
}
