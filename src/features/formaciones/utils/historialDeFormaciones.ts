import type { ParticipacionAnterior } from '../types/formaciones.types';
import { etiquetaDeDuracion } from './etiquetaDeDuracion';
import { nombreLargoDeFormacion } from './nombreDeFormacion';
import { resultadoEnPalabras } from './resumenDeFormacion';

/**
 * Una formación que la persona ya cursó, como se lee en su ficha (spec 022): «Escuela Renaser · 3 meses» y debajo cómo terminó, hasta
 * qué día llegó y, si la dieron por terminada, el motivo. Texto puro, para probarlo sin pantalla; `fecha` formatea la fecha de fin
 * (recibe `AAAA-MM-DD` y devuelve cómo se dice).
 */
export function tituloDeLaParticipacion(anterior: ParticipacionAnterior): string {
  return `${nombreLargoDeFormacion(anterior.formacion)} · ${etiquetaDeDuracion(anterior.duracionDias)}`;
}

export function detalleDeLaParticipacion(anterior: ParticipacionAnterior, fecha: (iso: string) => string): string {
  const partes = [`${resultadoEnPalabras(anterior.resultado)} el ${fecha(anterior.fechaFin)}`, `llegó al día ${anterior.diaFinal}`];
  if (anterior.puntosLiga !== null) partes.push(`${anterior.puntosLiga} puntos`);
  const base = partes.join(' · ');
  return anterior.motivo ? `${base}. Motivo: ${anterior.motivo}` : base;
}
