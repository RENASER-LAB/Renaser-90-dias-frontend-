import type { ItemDelDia } from '../../training/utils/itemsDelDia';
import { planEnFrase } from '../data/textosDelCierre';
import type { CierreDelDia, DiaDelCierre } from '../types/cierre.types';
import { pendientesDe } from './borradorDelCierre';

/**
 * La fila «Cierra tu día» como un ítem más de la lista de Training (spec 017). Es un tipo aparte (`cierre`): la lista
 * por hora lo ordena entre el resto, pero no cuenta como hecho ni da puntos, no se atrasa y no se despide.
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

/** El ítem de HOY: `hora` es la que dice `horaDelCierre`. */
export function itemDelCierreDeHoy(hoyIso: string, hora: string, vista: CierreDelDia): ItemDelDia {
  const cerrado = vista.estado === 'CERRADO';
  return {
    clave: `cierre-${hoyIso}`,
    tipo: 'cierre',
    titulo: cerrado ? TITULO_DEL_DIA_CERRADO : TITULO_DEL_CIERRE,
    hora,
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
 * El ítem de un día ANTERIOR (solo lectura): «Cerrado» o «Sin cerrar». Su hora es la del cierre, si lo hubo. Si el
 * servidor no dijo cómo quedó ese día (o dijo que sigue abierto), no hay fila: no se afirma lo que no se sabe.
 */
export function itemDelCierreDeUnDiaAnterior(fechaIso: string, vista: CierreDelDia): ItemDelDia | null {
  if (vista.estado !== 'CERRADO' && vista.estado !== 'SIN_CERRAR') return null;
  const cerrado = vista.estado === 'CERRADO';
  const cerradoA = cerrado ? horaDeUnInstante(vista.cerradoEn) : null;
  return {
    clave: `cierre-${fechaIso}`,
    tipo: 'cierre',
    titulo: cerrado ? TITULO_DEL_DIA_CERRADO : TITULO_DEL_CIERRE,
    hora: cerradoA,
    hecho: cerrado,
    icono: 'moon',
    dimension: null,
    puntos: null,
    guia: null,
    cierre: { estado: vista.estado, lineaDeManana: null, cerradoA },
  };
}
