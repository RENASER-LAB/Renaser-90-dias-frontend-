import type { DatosDeTraslado, ResumenDeFormacion } from '../types/formaciones.types';

/**
 * Pasar a un aprendiz a otra formación (spec 022, Q1-A y Q8-A): las reglas que la pantalla avisa antes de enviar. El servidor decide
 * (409 si todavía no terminó y no se lo dio por terminado; 400 si la formación no ofrece esa duración); aquí solo se evita el viaje
 * inútil y se dice qué falta.
 */
export type BorradorDeTraslado = {
  destino: string | null;
  duracionDias: number | null;
  darPorTerminada: boolean;
  motivo: string;
};

export const BORRADOR_DE_TRASLADO_VACIO: BorradorDeTraslado = { destino: null, duracionDias: null, darPorTerminada: false, motivo: '' };

const MOTIVO_MINIMO = 3;
export const MOTIVO_MAXIMO = 500;

/** Las formaciones a las que se puede pasar: las disponibles que no son la de ahora. */
export function destinosPosibles(formaciones: ResumenDeFormacion[], actual: string | null): ResumenDeFormacion[] {
  return formaciones.filter(f => f.activa && f.codigo !== actual);
}

/** Al elegir destino, la duración arranca en la primera que ofrece (la de siempre, 90, si la ofrece). */
export function duracionInicial(destino: ResumenDeFormacion): number | null {
  if (destino.duracionesDias.includes(90)) return 90;
  return destino.duracionesDias[0] ?? null;
}

/** Lo que falta para poder enviar, en una línea; `null` si ya se puede. */
export function errorDelTraslado(borrador: BorradorDeTraslado): string | null {
  if (!borrador.destino) return 'Elige a qué formación pasa.';
  if (borrador.duracionDias === null) return 'Elige la duración.';
  if (borrador.darPorTerminada) {
    const motivo = borrador.motivo.trim();
    if (motivo.length < MOTIVO_MINIMO) return 'Escribe el motivo (al menos 3 letras).';
    if (motivo.length > MOTIVO_MAXIMO) return `El motivo puede tener hasta ${MOTIVO_MAXIMO} letras.`;
  }
  return null;
}

export function paraTrasladar(borrador: BorradorDeTraslado): DatosDeTraslado {
  return {
    formacion: borrador.destino ?? '',
    duracionDias: borrador.duracionDias ?? 0,
    darPorTerminada: borrador.darPorTerminada,
    motivo: borrador.darPorTerminada ? borrador.motivo.trim() : null,
  };
}

/** El texto de la confirmación: qué pasa de verdad al pasarla (su programa empieza de cero allí). */
export function textoDeLaConfirmacion(nombre: string, destino: string): string {
  return `${nombre} pasa a ${destino} y empieza de cero allí: día 0, sin grupo ni mentor, con 100 puntos. Lo que hizo antes queda en su historial.`;
}
