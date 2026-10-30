import { TEXTO_SIN_LECTURA_DEL_DIA } from './filaDelDia';
import type { ItemDelDia } from './itemsDelDia';
import type { LecturaDelDia } from './lecturaDeDiasCerrados';
import type { RelacionConHoy } from './semanaDeTraining';

/**
 * Qué se ve al elegir un día que NO es hoy (spec 014). Decide, sin pedir nada, entre lo que dijo el servidor y lo
 * planificado:
 *
 * - **Un día que viene**: lo planificado, sin botones.
 * - **Un día anterior con lectura del servidor** (`datos`): ✓ en lo hecho y candado en lo demás.
 * - **Un día anterior sin lectura** —no se pudo pedir (fuera de la semana o del programa), el servidor no lo tiene
 *   (404, 400) o la respuesta no calza— o con un error: lo planificado, con «Lo que hiciste ese día está en Yo → Mis
 *   evidencias.», sin ✓ ni candado inventados. Con error, además, un «Reintentar» (no se reintenta solo).
 *
 * `itemsLeidos` y `itemsPlanificados` son funciones para armar solo lo que se usa.
 */
export interface VistaDeOtroDia {
  estado: 'cargando' | 'listo';
  items: ItemDelDia[];
  /** `true` = ✓ y candados reales (lectura del servidor). */
  conLectura: boolean;
  resumen: string;
  nota: string | null;
  /** Mostrar el «Reintentar» de una lectura que falló. */
  puedeReintentar: boolean;
}

export const TEXTO_PLANIFICACION_FUTURA = 'Es tu planificación. Para cambiar una hora, toca el engranaje.';
export const TEXTO_LEYENDO_EL_DIA = 'Leyendo ese día…';
/** Pedido del dueño (2026-10-30): una línea y «Reintentar»; no se manda a otra pantalla cuando lo que toca es reintentar. */
export const TEXTO_LECTURA_FALLIDA = 'No pudimos cargar este día.';
/** El servidor respondió `[]`: ese día no hubo hábitos registrados. No se inventan ✓ ni candados. */
export const TEXTO_SIN_HABITOS_REGISTRADOS = 'Ese día no tuviste hábitos registrados.';

export function vistaDeOtroDia(params: {
  relacion: Exclude<RelacionConHoy, 'hoy'>;
  /** `false` = ni se intentó pedir ese día (ver `sePuedeLeerElDia`). */
  leible: boolean;
  /** El día es anterior al Día 1 del programa: no había nada planificado ni que registrar. */
  previoAlPrograma?: boolean;
  lectura: LecturaDelDia | undefined;
  itemsLeidos: () => ItemDelDia[];
  itemsPlanificados: () => ItemDelDia[];
}): VistaDeOtroDia {
  const { relacion, leible, lectura } = params;

  if (relacion === 'futuro') {
    return {
      estado: 'listo',
      items: params.itemsPlanificados(),
      conLectura: false,
      resumen: 'Así quedó planificado. Se registra ese día.',
      nota: TEXTO_PLANIFICACION_FUTURA,
      puedeReintentar: false,
    };
  }

  if (params.previoAlPrograma) {
    return {
      estado: 'listo',
      items: [],
      conLectura: false,
      resumen: 'Tu programa empezó después de este día.',
      nota: null,
      puedeReintentar: false,
    };
  }

  if (leible && (lectura === undefined || lectura.estado === 'cargando')) {
    return { estado: 'cargando', items: [], conLectura: false, resumen: TEXTO_LEYENDO_EL_DIA, nota: null, puedeReintentar: false };
  }

  if (leible && lectura?.estado === 'datos') {
    const items = params.itemsLeidos();
    const propios = items.filter(x => x.tipo !== 'evento');
    const hechos = propios.filter(x => x.hecho).length;
    if (propios.length === 0) {
      return { estado: 'listo', items, conLectura: true, resumen: TEXTO_SIN_HABITOS_REGISTRADOS, nota: null, puedeReintentar: false };
    }
    return {
      estado: 'listo',
      items,
      conLectura: true,
      resumen: `${hechos} de ${propios.length} ${propios.length === 1 ? 'hecho' : 'hechos'} · ese día ya cerró`,
      nota: 'Lo que no registraste ese día queda con candado: ya no se puede subir.',
      puedeReintentar: false,
    };
  }

  const huboError = leible && lectura?.estado === 'error';
  return {
    estado: 'listo',
    items: params.itemsPlanificados(),
    conLectura: false,
    resumen: 'Así lo planificaste. Ese día ya cerró.',
    nota: huboError ? TEXTO_LECTURA_FALLIDA : TEXTO_SIN_LECTURA_DEL_DIA,
    puedeReintentar: huboError,
  };
}
