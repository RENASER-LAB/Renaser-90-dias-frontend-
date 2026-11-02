import { z } from 'zod';

import { horaLocal } from '../../training/utils/tarjetaDelHabito';
import { formatoPasos, kmConUnidad } from './textosDePasos';

/**
 * Lo que ven el mentor, la guía, el líder y Administración de los km de un día (spec 037, D-310): cuántos km, quién los midió
 * (el reloj, el teléfono, o la captura de la persona), la fuente y la hora de la lectura, y «Por revisar» si el servidor dejó
 * dudosa la lectura. Es lectura: no entra a ningún cálculo y no se muestra ningún otro dato de salud.
 *
 * Viene en cada obligación (`medicion`, aditivo): un backend anterior no lo manda y la fila queda como estaba.
 */

export const medicionDeLaFichaSchema = z
  .object({
    valor: z.number(),
    origen: z.string(),
    pasos: z.number().nullish(),
    fuente: z.string().nullish(),
    dispositivo: z.string().nullish(),
    leidaEn: z.string().nullish(),
    porRevisar: z.boolean().nullish(),
  })
  .passthrough();

export interface MedicionDeLaFicha {
  valor: number;
  /** `MANUAL` (la captura) o `HEALTH_CONNECT` (lo leyó el teléfono). */
  origen: string;
  pasos: number | null;
  fuente: string | null;
  dispositivo: string | null;
  leidaEn: string | null;
  porRevisar: boolean;
}

/** Tolerante: un valor roto pierde la línea de los km, no el día entero. */
export function medicionDeLaFichaDe(crudo: unknown): MedicionDeLaFicha | null {
  const resultado = medicionDeLaFichaSchema.safeParse(crudo);
  if (!resultado.success) return null;
  const m = resultado.data;
  return {
    valor: m.valor,
    origen: m.origen,
    pasos: m.pasos ?? null,
    fuente: m.fuente?.trim() || null,
    dispositivo: m.dispositivo ?? null,
    leidaEn: m.leidaEn ?? null,
    porRevisar: m.porRevisar === true,
  };
}

export interface TextosDeLaMedicion {
  /** «5,9 km · Medido por el reloj». */
  principal: string;
  /** «Pasos 7 840 · Distancia 5,9 km»; solo en la lectura automática. */
  detalle: string | null;
  /** «Galaxy Watch · leído a las 17:10»; solo en la lectura automática. */
  fuente: string | null;
  porRevisar: boolean;
}

function quienLoMidio(m: MedicionDeLaFicha): string {
  if (m.origen !== 'HEALTH_CONNECT') return 'Captura de la persona';
  if (m.dispositivo === 'RELOJ') return 'Medido por el reloj';
  if (m.dispositivo === 'TELEFONO') return 'Medido por el teléfono';
  return 'Medido por una app';
}

export function textosDeLaMedicion(m: MedicionDeLaFicha): TextosDeLaMedicion {
  const automatica = m.origen === 'HEALTH_CONNECT';
  const hora = automatica ? horaLocal(m.leidaEn) : null;
  const detalle = automatica
    ? [m.pasos != null ? `Pasos ${formatoPasos(m.pasos)}` : null, `Distancia ${kmConUnidad(m.valor)}`].filter(Boolean).join(' · ')
    : null;
  const fuente = automatica && m.fuente ? `${m.fuente}${hora ? ` · leído a las ${hora}` : ''}` : null;
  return { principal: `${kmConUnidad(m.valor)} · ${quienLoMidio(m)}`, detalle, fuente, porRevisar: m.porRevisar };
}

/** Lo que oye el lector de pantalla: lo mismo, en una frase. */
export function dichoDeLaMedicion(m: MedicionDeLaFicha): string {
  const t = textosDeLaMedicion(m);
  return [t.principal, t.detalle, t.fuente, t.porRevisar ? 'Por revisar' : null].filter(Boolean).join('. ') + '.';
}
