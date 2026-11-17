import { LARGO_MAXIMO_DE_LA_NOTA } from '../api/mentorApi';

/**
 * Lo que falta o sobra en una nota antes de guardarla (spec 055 FR-026): ni vacía ni de solo espacios, ni de más de 2000 caracteres
 * (sin contar los espacios de los extremos). `null` = se puede guardar. El servidor vuelve a validarlo.
 */
export function validarNota(texto: string): string | null {
  const limpio = texto.trim();
  if (limpio.length === 0) return 'Escribe la nota antes de guardarla.';
  if (limpio.length > LARGO_MAXIMO_DE_LA_NOTA) return `La nota puede tener hasta ${LARGO_MAXIMO_DE_LA_NOTA} caracteres. Esta tiene ${limpio.length}.`;
  return null;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «12 nov 2026, 14:30» — la fecha y hora de una nota, en la hora del teléfono de quien la lee. */
export function fechaDeLaNota(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}
