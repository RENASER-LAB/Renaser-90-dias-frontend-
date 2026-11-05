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
    // Spec 042 (FR-044): las carreras con GPS del día. Tolerante: una carrera rota se pierde ella, no la línea.
    carreras: z.array(z.unknown()).nullish(),
  })
  .passthrough();

const carreraDeLaFichaSchema = z
  .object({
    carreraId: z.string(),
    kilometros: z.number(),
    duracionActivaSeg: z.number(),
    ritmoSegPorKm: z.number().nullish(),
    porRevisar: z.boolean().nullish(),
    cuentaParaElHabito: z.boolean().nullish(),
    tieneRuta: z.boolean().nullish(),
  })
  .passthrough();

/** Una carrera con GPS en la ficha (spec 042). La ruta se pide aparte, al abrir el mapa (FR-041: todavía sin pantalla). */
export interface CarreraDeLaFicha {
  carreraId: string;
  kilometros: number;
  duracionActivaSeg: number;
  ritmoSegPorKm: number | null;
  porRevisar: boolean;
  cuentaParaElHabito: boolean;
  tieneRuta: boolean;
}

export interface MedicionDeLaFicha {
  valor: number;
  /** `MANUAL` (la captura) o `HEALTH_CONNECT` (lo leyó el teléfono). */
  origen: string;
  pasos: number | null;
  fuente: string | null;
  dispositivo: string | null;
  leidaEn: string | null;
  porRevisar: boolean;
  /** Spec 042: las carreras con GPS del día (vacía sin carreras o con un backend anterior). */
  carreras: CarreraDeLaFicha[];
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
    carreras: (m.carreras ?? []).flatMap(crudo => {
      const r = carreraDeLaFichaSchema.safeParse(crudo);
      if (!r.success) return [];
      const c = r.data;
      return [
        {
          carreraId: c.carreraId,
          kilometros: c.kilometros,
          duracionActivaSeg: c.duracionActivaSeg,
          ritmoSegPorKm: c.ritmoSegPorKm ?? null,
          porRevisar: c.porRevisar === true,
          cuentaParaElHabito: c.cuentaParaElHabito !== false,
          tieneRuta: c.tieneRuta === true,
        },
      ];
    }),
  };
}

/**
 * ¿Los km del día los midió el teléfono (carrera con GPS o Health Connect)? Entonces la medición ES la constancia y la ficha no dice
 * «Evidencia sin entregar» aunque el hábito pida la captura (issue #134; spec 042 FR-044, spec 037).
 */
export function seMidioSolo(medicion: Pick<MedicionDeLaFicha, 'origen' | 'valor'> | null | undefined): boolean {
  return !!medicion && medicion.valor > 0 && (medicion.origen === 'GPS' || medicion.origen === 'HEALTH_CONNECT');
}

export interface TextosDeLaMedicion {
  /** «5,9 km · Medido por el reloj». */
  principal: string;
  /** «Pasos 7 840 · Distancia 5,9 km»; solo en la lectura automática. */
  detalle: string | null;
  /** «Galaxy Watch · leído a las 17:10»; solo en la lectura automática. */
  fuente: string | null;
  porRevisar: boolean;
  /** Spec 042: una línea por carrera, «6,21 km · 36:55 · 5:57 min/km · Por revisar». */
  carreras: string[];
}

function duracionCorta(seg: number): string {
  const t = Math.max(0, Math.round(seg));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const dos = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${m}:${dos(s)}`;
}

/** «6,21 km · 36:55 · 5:57 min/km», con «No cuenta» o «Por revisar» si el servidor lo dijo. */
export function lineaDeLaCarrera(c: CarreraDeLaFicha): string {
  const ritmo = c.ritmoSegPorKm != null && c.ritmoSegPorKm > 0 ? `${duracionCorta(c.ritmoSegPorKm)} min/km` : null;
  return [
    kmConUnidad(c.kilometros),
    duracionCorta(c.duracionActivaSeg),
    ritmo,
    c.cuentaParaElHabito ? null : 'No cuenta',
    c.porRevisar ? 'Por revisar' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function quienLoMidio(m: MedicionDeLaFicha): string {
  // Spec 042 (FR-044): el día con carreras viene con origen GPS.
  if (m.origen === 'GPS') return 'Carrera con GPS';
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
  return {
    principal: `${kmConUnidad(m.valor)} · ${quienLoMidio(m)}`,
    detalle,
    fuente,
    porRevisar: m.porRevisar,
    carreras: m.carreras.map(lineaDeLaCarrera),
  };
}

/** Lo que oye el lector de pantalla: lo mismo, en una frase. */
export function dichoDeLaMedicion(m: MedicionDeLaFicha): string {
  const t = textosDeLaMedicion(m);
  return [t.principal, t.detalle, t.fuente, ...t.carreras.map(l => `Carrera: ${l}`), t.porRevisar ? 'Por revisar' : null].filter(Boolean).join('. ') + '.';
}
