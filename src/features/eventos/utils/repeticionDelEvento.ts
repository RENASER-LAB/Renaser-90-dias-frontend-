import { diaEnPalabras } from './textosDeFecha';
import { instanteEnZona, sumarDiasIso } from './zonaHoraria';

/**
 * «Repetir por días» al crear un evento (spec 053, FR-007 a FR-012; D-357). Pedido del dueño: «que no sea complicada». El servidor ya acepta la
 * repetición semanal por días (`recurrenceByWeekday` ISO, 1 = lunes … 7 = domingo, y `recurrenceUntil` o `recurrenceCount`): acá solo se elige.
 *
 * La «inteligencia» son los valores de partida: el día de la fecha elegida ya viene marcado y el fin sugerido es de 4 semanas.
 */

export type FinDeLaRepeticion =
  | { tipo: 'semanas'; semanas: number }
  | { tipo: 'hasta'; fecha: string };

export interface RepeticionDelFormulario {
  activa: boolean;
  /** Días ISO (1 = lunes … 7 = domingo), sin repetir y en orden. */
  dias: number[];
  /** Si la persona ya tocó los días: desde ahí cambiar la fecha ya no los mueve. */
  diasTocados: boolean;
  fin: FinDeLaRepeticion;
}

export const SEMANAS_SUGERIDAS = 4;
export const MAX_SEMANAS = 12;

/** Los botones de día, de lunes a domingo, con su letra y su nombre completo para el lector de pantalla. */
export const DIAS_DE_LA_SEMANA: ReadonlyArray<{ iso: number; letra: string; nombre: string }> = [
  { iso: 1, letra: 'L', nombre: 'lunes' },
  { iso: 2, letra: 'M', nombre: 'martes' },
  { iso: 3, letra: 'M', nombre: 'miércoles' },
  { iso: 4, letra: 'J', nombre: 'jueves' },
  { iso: 5, letra: 'V', nombre: 'viernes' },
  { iso: 6, letra: 'S', nombre: 'sábado' },
  { iso: 7, letra: 'D', nombre: 'domingo' },
];

/** Día ISO (1 = lunes … 7 = domingo) de `YYYY-MM-DD`. */
export function diaIsoDe(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  const js = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}

/** Apagada, con el día de la fecha marcado y 4 semanas. */
export function repeticionInicial(fecha: string): RepeticionDelFormulario {
  return { activa: false, dias: [diaIsoDe(fecha)], diasTocados: false, fin: { tipo: 'semanas', semanas: SEMANAS_SUGERIDAS } };
}

/** Marca o desmarca un día. Si es el último marcado no lo quita: la pantalla pediría elegir otro y no se puede dejar vacío sin querer. */
export function alternarDia(rep: RepeticionDelFormulario, iso: number): RepeticionDelFormulario {
  const esta = rep.dias.includes(iso);
  if (esta && rep.dias.length === 1) return { ...rep, diasTocados: true };
  const dias = esta ? rep.dias.filter(d => d !== iso) : [...rep.dias, iso].sort((a, b) => a - b);
  return { ...rep, dias, diasTocados: true };
}

/** Al cambiar la fecha del evento, los días que nadie tocó siguen al día de la fecha. */
export function alCambiarLaFecha(rep: RepeticionDelFormulario, fecha: string): RepeticionDelFormulario {
  const siguiente = rep.diasTocados ? rep : { ...rep, dias: [diaIsoDe(fecha)] };
  // Un «hasta» que quedó antes de la fecha nueva se corre a 4 semanas desde ella.
  if (siguiente.fin.tipo === 'hasta' && siguiente.fin.fecha < fecha) {
    return { ...siguiente, fin: { tipo: 'semanas', semanas: SEMANAS_SUGERIDAS } };
  }
  return siguiente;
}

/** La primera fecha, desde `fecha` (inclusive), cuyo día de la semana está marcado. */
export function primeraFechaDeLaSerie(fecha: string, dias: readonly number[]): string {
  for (let i = 0; i < 7; i++) {
    const candidata = sumarDiasIso(fecha, i);
    if (dias.includes(diaIsoDe(candidata))) return candidata;
  }
  return fecha;
}

/** El último día de la serie. */
export function ultimoDiaDeLaSerie(rep: RepeticionDelFormulario, primera: string): string {
  return rep.fin.tipo === 'semanas' ? sumarDiasIso(primera, 7 * rep.fin.semanas - 1) : rep.fin.fecha;
}

function listaDeDias(dias: readonly number[]): string {
  const nombres = DIAS_DE_LA_SEMANA.filter(d => dias.includes(d.iso)).map(d => d.nombre);
  if (nombres.length === 7) return 'todos los días';
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** «Se repite lunes y jueves, 4 semanas, hasta el 13 de diciembre.» (FR-008) */
export function resumenDeLaRepeticion(rep: RepeticionDelFormulario, fecha: string): string {
  const primera = primeraFechaDeLaSerie(fecha, rep.dias);
  const dias = listaDeDias(rep.dias);
  const hasta = diaEnPalabras(ultimoDiaDeLaSerie(rep, primera)).split(' ').slice(1).join(' ');
  const texto =
    rep.fin.tipo === 'semanas'
      ? `Se repite ${dias}, ${rep.fin.semanas} ${rep.fin.semanas === 1 ? 'semana' : 'semanas'}, hasta el ${hasta}.`
      : `Se repite ${dias}, hasta el ${hasta}.`;
  return primera === fecha ? texto : `${texto} Empieza el ${diaEnPalabras(primera).toLowerCase()}.`;
}

export type CamposDeRepeticion =
  | { ok: true; fecha: string; campos: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Lo que viaja al servidor (FR-009). `fecha` es la de la primera ocurrencia: si la elegida no cae en un día marcado, el evento empieza el primer día
 * marcado desde ella (el servidor solo cuenta como ocurrencia los días de la lista). El fin por fecha o semanas es el FINAL de ese día en la zona.
 */
export function camposDeRepeticion(rep: RepeticionDelFormulario, fecha: string, zona: string): CamposDeRepeticion {
  if (rep.dias.length === 0) return { ok: false, error: 'Elige al menos un día para repetir.' };
  const primera = primeraFechaDeLaSerie(fecha, rep.dias);
  const base: Record<string, unknown> = {
    recurrenceFrequency: 'WEEKLY',
    recurrenceInterval: 1,
    recurrenceByWeekday: [...rep.dias].sort((a, b) => a - b),
  };
  if (rep.fin.tipo === 'semanas' && (rep.fin.semanas < 1 || rep.fin.semanas > MAX_SEMANAS)) {
    return { ok: false, error: `Las semanas van de 1 a ${MAX_SEMANAS}.` };
  }
  const ultimo = ultimoDiaDeLaSerie(rep, primera);
  if (ultimo < primera) return { ok: false, error: 'El «hasta» no puede ser antes de que empiece.' };
  // Fin del día en la zona del evento: el comienzo del día siguiente menos un milisegundo.
  const finDelDia = instanteEnZona(sumarDiasIso(ultimo, 1), '00:00', zona);
  if (finDelDia === null) return { ok: false, error: 'Revisa el «hasta».' };
  return { ok: true, fecha: primera, campos: { ...base, recurrenceUntil: new Date(finDelDia - 1).toISOString() } };
}
