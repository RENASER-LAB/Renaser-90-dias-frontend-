import { sePuedeLeerElDia, tituloDelDia, semanaDe, type DiaDeLaSemana } from '../../training/utils/semanaDeTraining';
import type { CierreDelDia } from '../types/cierre.types';
import type { LecturaDelCierre } from './lecturaDeCierres';
import { horaDeUnInstante } from './tarjetaDelCierre';
import { respuestaEnPalabras } from './textosDeLosCierres';

/**
 * La semana de la tarjeta «Cierra tu día» de Plan (spec 033): los siete días de lunes a domingo y cuáles se pueden mirar.
 * Todo puro. Un día anterior se lee del servidor SOLO cuando la persona lo toca (la misma regla de la spec 017): acá solo se
 * dice cuáles se pueden tocar y qué decir de cada uno.
 */

export interface DiaDeLaTarjeta extends DiaDeLaSemana {
  /** De ayer hacia atrás, hasta el lunes y no antes del Día 1: el servidor no lee otro (rechaza con 400). */
  leible: boolean;
}

/** Los siete días de la semana de hoy, con cuáles se pueden leer. */
export function diasDeLaTarjeta(hoyIso: string, diaPrograma: number | null | undefined): DiaDeLaTarjeta[] {
  return semanaDe(hoyIso).map(dia => ({ ...dia, leible: sePuedeLeerElDia(dia.iso, hoyIso, diaPrograma) }));
}

/** ¿Hay algún día anterior que mirar? Si no (lunes, o el Día 1 es hoy), la fila de la semana no se dibuja. */
export function hayDiasAnteriores(dias: readonly DiaDeLaTarjeta[]): boolean {
  return dias.some(d => d.leible);
}

/** Lo que dice la línea de un día anterior ya tocado. */
export interface TextoDeUnDia {
  /** «Jueves 29 · Cerrado a las 21:40» o «Jueves 29 · Sin cerrar». */
  titulo: string;
  /** Una línea por cada pendiente con lo que respondió (««Revisar las facturas»: No me alcanzó el tiempo → Hacerla a otra hora»). */
  respuestas: string[];
  /** La nota del día, si la dejó. */
  nota: string | null;
}

export const TEXTO_CARGANDO_EL_DIA = 'Leyendo ese día…';
export const TEXTO_SIN_CIERRE_PARA_MOSTRAR = 'No hay un cierre de ese día para mostrar.';
export const TEXTO_NO_SE_PUDO_LEER = 'No pudimos cargar este día.';

/** El estado de un día en palabras, sin culpa: «Cerrado a las 21:40» o «Sin cerrar». `null` si el servidor no lo dijo. */
export function estadoDelDiaEnPalabras(cierre: Pick<CierreDelDia, 'estado' | 'cerradoEn'>): string | null {
  if (cierre.estado === 'CERRADO') {
    const hora = horaDeUnInstante(cierre.cerradoEn);
    return hora ? `Cerrado a las ${hora}` : 'Cerrado';
  }
  if (cierre.estado === 'SIN_CERRAR') return 'Sin cerrar';
  return null;
}

/** Lo que se muestra de un día anterior leído, o `null` si el servidor no dijo cómo quedó (ni «cerrado» ni «sin cerrar»). */
export function textoDeUnDia(cierre: CierreDelDia): TextoDeUnDia | null {
  const estado = estadoDelDiaEnPalabras(cierre);
  if (!estado) return null;
  const respuestas =
    cierre.estado === 'CERRADO'
      ? cierre.acciones.flatMap(accion => {
          const dicho = accion.cierre ? respuestaEnPalabras(accion.cierre) : null;
          if (!dicho) return [];
          const nota = accion.cierre?.nota?.trim();
          return [`«${accion.titulo}»: ${dicho}${nota ? `. ${nota}` : ''}`];
        })
      : [];
  const nota = cierre.estado === 'CERRADO' ? cierre.nota?.trim() || null : null;
  return { titulo: `${tituloDelDia(cierre.fecha)} · ${estado}`, respuestas, nota };
}

/** El texto de una lectura que todavía no trajo datos (`cargando`, `sin-datos`, `error`); `null` si hay datos. */
export function textoDeLaLectura(lectura: LecturaDelCierre | undefined, fechaIso: string): string | null {
  if (!lectura || lectura.estado === 'cargando') return TEXTO_CARGANDO_EL_DIA;
  if (lectura.estado === 'sin-datos') return TEXTO_SIN_CIERRE_PARA_MOSTRAR;
  if (lectura.estado === 'error') return TEXTO_NO_SE_PUDO_LEER;
  return textoDeUnDia(lectura.cierre) ? null : `${tituloDelDia(fechaIso)} · ${TEXTO_SIN_CIERRE_PARA_MOSTRAR}`;
}
