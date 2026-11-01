import type { CodigoDeFormacion } from '../types/formaciones.types';

/**
 * Cómo se nombra cada formación cuando la pantalla solo tiene su código (el filtro, una fila de la lista). Son los nombres de fábrica
 * del catálogo; Administración puede cambiarlos en «Formaciones», y donde la pantalla tenga el nombre que manda el servidor usa ese.
 */
const NOMBRES: Record<CodigoDeFormacion, { corto: string; largo: string }> = {
  ESCUELA: { corto: 'Escuela', largo: 'Escuela Renaser' },
  DIPLOMADO: { corto: 'Diplomado', largo: 'Diplomado Renaser' },
  CERTIFICACION: { corto: 'Certificación', largo: 'Certificación Renaser' },
};

function conocida(codigo: string): codigo is CodigoDeFormacion {
  return codigo in NOMBRES;
}

export function nombreCortoDeFormacion(codigo: string): string {
  return conocida(codigo) ? NOMBRES[codigo].corto : codigo;
}

export function nombreLargoDeFormacion(codigo: string): string {
  return conocida(codigo) ? NOMBRES[codigo].largo : codigo;
}

/**
 * El nombre configurado de una formación, sin el «Renaser» del final, para donde no cabe entero (el selector de la Comunidad y el
 * rótulo de una fila): «Diplomado Renaser» → «Diplomado». Si Administración le puso otro nombre (sin ese final), se queda tal cual.
 */
export function nombreSinRenaser(nombre: string): string {
  const limpio = nombre.trim();
  const corto = limpio.replace(/\s+Renaser$/i, '').trim();
  return corto.length > 0 ? corto : limpio;
}
