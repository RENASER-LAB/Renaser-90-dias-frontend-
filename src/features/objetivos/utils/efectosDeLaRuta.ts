import type { NivelDeLaRuta } from './rutaDelPlan';

/**
 * Cuándo se dispara cada efecto de la ruta de Plan (spec 058, FR-014). Lógica pura: compara lo que se veía antes con lo que se ve
 * ahora y dice qué cambió DE VERDAD. Cada efecto sale una sola vez por cambio real; con la misma foto dos veces no sale nada, así
 * una lectura vieja o un redibujado nunca lo repite. Lo que se anima (solo `transform` y `opacity`, en el hilo de la interfaz) y el
 * háptico los pone `components/RutaDelPlan`; con «Reducir movimiento» no se anima nada, pero el háptico sí.
 */

export interface FotoDeLaRuta {
  /** Los ids de los niveles de acción ya cumplidos. */
  cumplidos: readonly string[];
  /** El id del siguiente por hacer, o `null`. */
  siguiente: string | null;
  cumplidas: number;
  total: number;
  cofreAbierto: boolean;
  /** De qué eje es la foto: cambiar de eje no es un cambio real, es otra ruta. */
  eje: string;
  /** `false` mientras la lectura no terminó (no hay niveles todavía): no cuenta como «antes». */
  cargada: boolean;
}

export function fotoDeLaRuta(niveles: readonly NivelDeLaRuta[], avance: { cumplidas: number; total: number }, eje: string, cargada: boolean): FotoDeLaRuta {
  return {
    cumplidos: niveles.filter(n => n.tipo === 'cumplido').map(n => n.clave),
    siguiente: niveles.find(n => n.tipo === 'siguiente')?.clave ?? null,
    cumplidas: avance.cumplidas,
    total: avance.total,
    cofreAbierto: niveles.some(n => n.tipo === 'cofre' && n.abierto === true),
    eje,
    cargada,
  };
}

export interface EfectosDeLaRuta {
  /** Niveles que acaban de pasar a cumplido: «pop» corto, check que se dibuja y háptico de éxito. */
  popDe: string[];
  /** El fénix salta de un nivel al otro (solo si hubo un cumplido nuevo y el siguiente cambió). */
  saltoDelFenix: { desde: string; hasta: string } | null;
  /** La cifra «N de M» de la franja sube y su barra se llena. */
  cuentaSubio: boolean;
  /** El cofre se abrió: rebote y brillo, una sola vez. */
  cofreSeAbrio: boolean;
}

export const SIN_EFECTOS: EfectosDeLaRuta = Object.freeze({ popDe: [], saltoDelFenix: null, cuentaSubio: false, cofreSeAbrio: false }) as EfectosDeLaRuta;

/** Qué cambió entre `antes` y `ahora`. Sin foto cargada de antes, o en otro eje, nada: la primera lectura no celebra. */
export function efectosQueSeDisparan(antes: FotoDeLaRuta | null, ahora: FotoDeLaRuta): EfectosDeLaRuta {
  if (!antes || !antes.cargada || !ahora.cargada || antes.eje !== ahora.eje) return SIN_EFECTOS;
  const yaEstaban = new Set(antes.cumplidos);
  const popDe = ahora.cumplidos.filter(id => !yaEstaban.has(id));
  const salta = popDe.length > 0 && antes.siguiente !== null && ahora.siguiente !== null && antes.siguiente !== ahora.siguiente;
  return {
    popDe,
    saltoDelFenix: salta ? { desde: popDe.includes(antes.siguiente as string) ? (antes.siguiente as string) : popDe[popDe.length - 1], hasta: ahora.siguiente as string } : null,
    cuentaSubio: ahora.cumplidas > antes.cumplidas,
    cofreSeAbrio: !antes.cofreAbierto && ahora.cofreAbierto,
  };
}

/* ------------------------------------------------------------------------------------------------
 * La cascada al entrar y la respiración del siguiente
 * ---------------------------------------------------------------------------------------------- */

/** Total de la cascada de entrada: menos de 300 ms (FR-014). */
export const DURACION_TOTAL_DE_LA_CASCADA_MS = 280;
export const DURACION_DE_CADA_NIVEL_EN_LA_CASCADA_MS = 160;

/** El retraso de cada nivel de la cascada: se reparten para que el último termine antes de los 280 ms, sea cual sea la cantidad. */
export function retrasoDeLaCascada(indice: number, cantidad: number): number {
  if (cantidad <= 1) return 0;
  const margen = DURACION_TOTAL_DE_LA_CASCADA_MS - DURACION_DE_CADA_NIVEL_EN_LA_CASCADA_MS;
  return Math.round((Math.min(indice, cantidad - 1) * margen) / (cantidad - 1));
}

/** La cascada sale solo la primera vez que se abre Plan en la sesión y solo si hay niveles. `yaSalio` lo guarda quien dibuja. */
export function debeHacerLaCascada(yaSalio: boolean, hayNiveles: boolean): boolean {
  return !yaSalio && hayNiveles;
}

/** El siguiente «respira» mientras nadie lo toca; en cuanto la persona lo toca (ese mismo nivel), se detiene. */
export function respiraElSiguiente(clave: string, siguiente: string | null, tocado: string | null): boolean {
  return siguiente !== null && clave === siguiente && tocado !== clave;
}
