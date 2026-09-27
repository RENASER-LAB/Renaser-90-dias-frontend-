import { fechaEnZona, horaEnZona } from './zonaHoraria';

/**
 * Fechas en palabras, sin depender del `Intl` en español del motor (Hermes no siempre trae los
 * nombres de días y meses). Lo que se muestra sale de la fecha en la zona que se pida.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** `YYYY-MM-DD` → «Jueves 1 de octubre». */
export function diaEnPalabras(fechaIso: string): string {
  const [a, m, d] = fechaIso.split('-').map(Number);
  const diaSemana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${mayuscula(DIAS[diaSemana])} ${d} de ${MESES[m - 1]}`;
}

/** «Hoy», «Mañana» o «Jueves 1 de octubre», comparando con `hoyIso` (misma zona). */
export function diaRelativo(fechaIso: string, hoyIso: string, mananaIso: string): string {
  if (fechaIso === hoyIso) return 'Hoy';
  if (fechaIso === mananaIso) return 'Mañana';
  return diaEnPalabras(fechaIso);
}

/** «Jueves 1 de octubre · 19:30», en la zona del evento. */
export function fechaYHora(instante: string, zona: string | null): string {
  return `${diaEnPalabras(fechaEnZona(instante, zona))} · ${horaEnZona(instante, zona)}`;
}

/** «1 hora», «90 minutos». `null` si no hay duración. */
export function duracionEnPalabras(minutos: number | null): string | null {
  if (!minutos || minutos <= 0) return null;
  if (minutos % 60 === 0) return minutos === 60 ? '1 hora' : `${minutos / 60} horas`;
  return `${minutos} minutos`;
}
