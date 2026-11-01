import type { DiaDeLaOfertaApi, OfertaDeRepetirApi } from '../../habits/types/habits.types';
import { combinacionDeLaApi } from '../../habits/notificaciones/utils/combinacionDeAlarma';
import { etiquetaDeAntelacion } from '../../habits/utils/etiquetaDeAntelacion';
import { DIAS_DEL_PLAN, NOMBRE_ISO_DEL_DIA } from '../../habits/utils/semanaDelPlan';
import { avisoOrdenado } from './avisoDeLosDias';
import { resumenDeLaCombinacion } from './comoSuena';

/**
 * Repetir la semana (spec 028, decisión del dueño 028-1 A y 028-3): las frases de la oferta y el resumen por hábito, todo puro y
 * sin tocar la pantalla ni el servidor. El servidor decide cuándo hay oferta y qué se copia (`GET …/week-repeat`); acá solo se la lee
 * y se la dice en palabras de la persona.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `YYYY-MM-DD` → fecha local a mediodía (el mediodía evita que un cambio de hora corra el día). */
function aFecha(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, 12, 0, 0, 0);
}

function aIso(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** Suma días a una fecha `YYYY-MM-DD`. */
export function sumarDiasIso(iso: string, dias: number): string {
  const fecha = aFecha(iso);
  fecha.setDate(fecha.getDate() + dias);
  return aIso(fecha);
}

/** El domingo de la semana que empieza ese lunes. */
export function domingoDeLaSemana(lunesIso: string): string {
  return sumarDiasIso(lunesIso, 6);
}

/**
 * La semana dicha en una frase corta: «26 oct al 1 nov» cuando cruza de mes y «2 al 8 nov» cuando no. Recibe el lunes (`YYYY-MM-DD`).
 */
export function fraseDeLaSemana(lunesIso: string): string {
  const desde = aFecha(lunesIso);
  const hasta = aFecha(domingoDeLaSemana(lunesIso));
  const mesHasta = MESES[hasta.getMonth()];
  if (desde.getMonth() === hasta.getMonth() && desde.getFullYear() === hasta.getFullYear()) {
    return `${desde.getDate()} al ${hasta.getDate()} ${mesHasta}`;
  }
  return `${desde.getDate()} ${MESES[desde.getMonth()]} al ${hasta.getDate()} ${mesHasta}`;
}

/** «Tu semana del 26 oct al 1 nov, en la del 2 al 8 nov»: lo que la tarjeta ofrece repetir. */
export function fraseDeLaOferta(oferta: Pick<OfertaDeRepetirApi, 'sourceWeekStart' | 'targetWeekStart'>): string {
  return `Tu semana del ${fraseDeLaSemana(oferta.sourceWeekStart)}, en la del ${fraseDeLaSemana(oferta.targetWeekStart)}`;
}

/** «Tu semana del 2 al 8 nov quedó como esta»: la confirmación al repetir. */
export function fraseDeLaConfirmacion(targetWeekStart: string): string {
  return `Tu semana del ${fraseDeLaSemana(targetWeekStart)} quedó como esta`;
}

/** «30 min antes y a la hora»: un aviso dicho en una frase (sin avisos: «sin aviso»). */
export function avisoDicho(aviso: readonly number[]): string {
  if (aviso.length === 0) return 'sin aviso';
  return avisoOrdenado(aviso).map(m => etiquetaDeAntelacion(m).toLowerCase()).join(' y ');
}

/** Lo que cambia en una fecha de la semana destino. */
export interface LineaDelDia {
  /** `sáb`: el día, para leer la lista. */
  dia: string;
  /** `09:00 · aviso 30 min antes y a la hora`, `no va` o `vuelve al plan de siempre`. */
  texto: string;
  /** Esa fecha ya tenía un cambio propio distinto que esta repetición reemplaza. */
  reemplaza: boolean;
}

function nombreCortoDelDia(weekday: string): string {
  const dia = DIAS_DEL_PLAN.find(d => NOMBRE_ISO_DEL_DIA[d] === weekday);
  return dia ? dia.toLowerCase() : weekday.toLowerCase();
}

/**
 * Qué cambia en esa fecha, en palabras: la hora (si es propia), el aviso (si es propio, incluido «sin aviso»), cómo suena (si es
 * propio) o «no va». Una fecha sin nada propio es una que vuelve al plan de siempre (la modelo no tenía cambio y la destino sí).
 */
export function lineaDelDia(dia: DiaDeLaOfertaApi): LineaDelDia {
  const reemplaza = dia.replaces === true;
  const nombre = nombreCortoDelDia(dia.weekday);
  if (dia.active === false) return { dia: nombre, texto: 'no va', reemplaza };
  const partes: string[] = [];
  if (dia.triggerTime && dia.customTime !== false) partes.push(dia.triggerTime.slice(0, 5));
  if (dia.customReminder === true) {
    const lista = dia.reminderEnabled === false ? [] : (dia.reminderMinutesList ?? []);
    partes.push(lista.length === 0 ? 'sin aviso' : `aviso ${avisoDicho(lista)}`);
  }
  const alarma = combinacionDeLaApi(dia.alarm);
  if (alarma) partes.push(`alarma: ${resumenDeLaCombinacion(alarma)}`);
  return { dia: nombre, texto: partes.length > 0 ? partes.join(' · ') : 'vuelve al plan de siempre', reemplaza };
}

/** Un hábito de la oferta con sus días ya dichos. */
export interface ResumenDeUnHabito {
  habitId: string;
  titulo: string;
  dias: LineaDelDia[];
}

/** El resumen por hábito, en el orden del servidor y los días en el de la semana. */
export function resumenDeLaOferta(oferta: OfertaDeRepetirApi): ResumenDeUnHabito[] {
  return oferta.habits.map(h => ({
    habitId: h.habitId,
    titulo: h.title,
    dias: [...h.days].sort((a, b) => a.date.localeCompare(b.date)).map(lineaDelDia),
  }));
}

/** «3 hábitos · 5 días»: el resumen corto de lo que se repite. */
export function resumenCorto(oferta: OfertaDeRepetirApi): string {
  const habitos = oferta.habits.length;
  const dias = oferta.habits.reduce((suma, h) => suma + h.days.length, 0);
  const h = habitos === 1 ? '1 hábito' : `${habitos} hábitos`;
  const d = dias === 1 ? '1 día' : `${dias} días`;
  return `${h} · ${d}`;
}

/** Por qué un hábito de la modelo no se repite, en palabras de la persona. */
export function motivoDeExclusion(reason: string): string {
  switch (reason) {
    case 'NOT_AVAILABLE':
      return 'ya no está en tu plan';
    default:
      return 'no se puede repetir';
  }
}

/* ------------------------------------------------------------------------------------------------
 * «Ahora no» (FR-012): se recuerda por cuenta en el teléfono, con la huella de la semana modelo.
 * ---------------------------------------------------------------------------------------------- */

/** Lo que se guarda al tocar «Ahora no»: la misma oferta (par de semanas y huella de la modelo). */
export interface DescarteDeLaOferta {
  modelo: string;
  siguiente: string;
  huella: string;
}

export function descarteDe(oferta: OfertaDeRepetirApi): DescarteDeLaOferta {
  return { modelo: oferta.sourceWeekStart, siguiente: oferta.targetWeekStart, huella: oferta.fingerprint };
}

/** `true` si esta oferta es exactamente la que la persona descartó: mismo par de semanas y misma huella. Si la modelo cambió, vuelve. */
export function estaDescartada(oferta: OfertaDeRepetirApi, descarte: DescarteDeLaOferta | null): boolean {
  return (
    descarte !== null
    && descarte.modelo === oferta.sourceWeekStart
    && descarte.siguiente === oferta.targetWeekStart
    && descarte.huella === oferta.fingerprint
  );
}

/** La oferta que se muestra: la leída, salvo que la persona ya la descartó. */
export function ofertaQueSeMuestra(oferta: OfertaDeRepetirApi | null, descarte: DescarteDeLaOferta | null): OfertaDeRepetirApi | null {
  return oferta !== null && !estaDescartada(oferta, descarte) ? oferta : null;
}

/** Lee lo guardado con tolerancia: algo que no se entiende es «nada descartado», nunca un error. */
export function leerDescarte(crudo: string | null): DescarteDeLaOferta | null {
  if (!crudo) return null;
  try {
    const x = JSON.parse(crudo) as Partial<DescarteDeLaOferta> | null;
    if (x && typeof x.modelo === 'string' && typeof x.siguiente === 'string' && typeof x.huella === 'string') {
      return { modelo: x.modelo, siguiente: x.siguiente, huella: x.huella };
    }
  } catch {
    // Un valor roto no es una oferta descartada.
  }
  return null;
}

/* ------------------------------------------------------------------------------------------------
 * «Volver al plan de siempre» más tarde: se recuerda la última semana repetida mientras no termina.
 * ---------------------------------------------------------------------------------------------- */

/** La semana (su lunes) que esta persona acaba de dejar igual a la anterior. */
export interface SemanaRepetida {
  semana: string;
}

export function leerSemanaRepetida(crudo: string | null): SemanaRepetida | null {
  if (!crudo) return null;
  try {
    const x = JSON.parse(crudo) as Partial<SemanaRepetida> | null;
    if (x && typeof x.semana === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.semana)) return { semana: x.semana };
  } catch {
    // Igual: un valor roto no es una semana repetida.
  }
  return null;
}

/** Mientras la semana no haya terminado (hoy no pasó de su domingo), «Volver al plan de siempre» tiene sentido. */
export function repetidaVigente(repetida: SemanaRepetida | null, hoyIso: string): SemanaRepetida | null {
  return repetida !== null && hoyIso <= domingoDeLaSemana(repetida.semana) ? repetida : null;
}
