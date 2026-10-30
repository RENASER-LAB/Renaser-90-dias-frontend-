import type { AccionDelCierre, CierreDelDia, CuerpoDelCierre } from '../types/cierre.types';
import { esMotivoConocido, esPlanConocido } from '../data/textosDelCierre';
import type { MotivoDelCierre, PlanDeManana } from '../types/cierre.types';

/**
 * Lo que la persona va eligiendo en la hoja antes de guardar (spec 017). Lógica pura: la hoja la dibuja y el botón
 * «Guardar mi cierre» se apaga con `puedeGuardar`.
 *
 * Las respuestas son por acción PENDIENTE. Lo cumplido no se pregunta: llega marcado y no entra al borrador ni al `PUT`.
 */

/** El mismo tope del servidor (`CierreDelDia.NOTA_MAXIMA`). */
export const NOTA_MAXIMA = 500;

export interface BorradorDeAccion {
  motivo: MotivoDelCierre | null;
  manana: PlanDeManana | null;
  nota: string;
}

export interface BorradorDelCierre {
  porAccion: Readonly<Record<string, BorradorDeAccion>>;
  /** La nota del DÍA: solo se escribe cuando no queda ninguna acción pendiente. */
  notaDelDia: string;
}

export function pendientesDe(vista: Pick<CierreDelDia, 'acciones'>): AccionDelCierre[] {
  return vista.acciones.filter(a => !a.cumplida);
}

export function cumplidasDe(vista: Pick<CierreDelDia, 'acciones'>): AccionDelCierre[] {
  return vista.acciones.filter(a => a.cumplida);
}

/** El borrador de una hoja que se abre: lo ya guardado de cada pendiente, o nada. */
export function borradorInicial(vista: Pick<CierreDelDia, 'acciones' | 'nota'>): BorradorDelCierre {
  const porAccion: Record<string, BorradorDeAccion> = {};
  for (const accion of pendientesDe(vista)) {
    const guardado = accion.cierre;
    porAccion[accion.id] = {
      motivo: esMotivoConocido(guardado?.motivo) ? guardado.motivo : null,
      manana: esPlanConocido(guardado?.manana) ? guardado.manana : null,
      nota: guardado?.nota ?? '',
    };
  }
  return { porAccion, notaDelDia: vista.nota ?? '' };
}

/** Cambia un campo de una acción; no toca las demás. */
export function conRespuesta(
  borrador: BorradorDelCierre,
  accionId: string,
  cambio: Partial<BorradorDeAccion>,
): BorradorDelCierre {
  const actual = borrador.porAccion[accionId] ?? { motivo: null, manana: null, nota: '' };
  return { ...borrador, porAccion: { ...borrador.porAccion, [accionId]: { ...actual, ...cambio } } };
}

/** Un largo máximo en caracteres como los cuenta una persona (un emoji es uno). */
export function recortarNota(texto: string): string {
  const letras = Array.from(texto);
  return letras.length > NOTA_MAXIMA ? letras.slice(0, NOTA_MAXIMA).join('') : texto;
}

/** Las pendientes a las que todavía les falta elegir qué pasó o qué harás mañana. */
export function loQueFalta(vista: Pick<CierreDelDia, 'acciones'>, borrador: BorradorDelCierre): AccionDelCierre[] {
  return pendientesDe(vista).filter(a => {
    const b = borrador.porAccion[a.id];
    return !b || b.motivo === null || b.manana === null;
  });
}

export function puedeGuardar(vista: Pick<CierreDelDia, 'acciones'>, borrador: BorradorDelCierre): boolean {
  return loQueFalta(vista, borrador).length === 0;
}

/**
 * La línea que dice por qué «Guardar mi cierre» está apagado, nombrando la acción:
 * «Elige qué pasó y qué harás mañana con «Revisar las facturas».». `null` si no falta nada.
 */
export function textoDeLoQueFalta(faltan: readonly AccionDelCierre[]): string | null {
  if (faltan.length === 0) return null;
  const nombres = faltan.map(a => `«${a.titulo}»`);
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return `Elige qué pasó y qué harás mañana con ${lista}.`;
}

function conTexto(texto: string): string | undefined {
  const limpio = texto.trim();
  return limpio === '' ? undefined : limpio;
}

/**
 * El cuerpo del `PUT`: una respuesta por cada pendiente (las cumplidas no viajan), las notas sin espacios de más y sin
 * el campo si están vacías. La nota del día viaja la que se escribió cuando no queda nada pendiente; con pendientes la
 * hoja no la muestra, así que se vuelve a mandar la que ya había (guardar no la borra).
 */
export function cuerpoDelCierre(fecha: string, vista: Pick<CierreDelDia, 'acciones' | 'nota'>, borrador: BorradorDelCierre): CuerpoDelCierre {
  const pendientes = pendientesDe(vista);
  const acciones = pendientes.flatMap(a => {
    const b = borrador.porAccion[a.id];
    if (!b || b.motivo === null || b.manana === null) return [];
    const nota = conTexto(b.nota);
    return [{ id: a.id, motivo: b.motivo, manana: b.manana, ...(nota ? { nota } : {}) }];
  });
  const notaDelDia = conTexto(pendientes.length === 0 ? borrador.notaDelDia : (vista.nota ?? ''));
  return { fecha, acciones, ...(notaDelDia ? { nota: notaDelDia } : {}) };
}
