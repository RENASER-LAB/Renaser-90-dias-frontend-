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
