import { sumarDiasIso } from '../../eventos/utils/zonaHoraria';

/**
 * Las fechas de la ficha del aprendiz (spec 055 FR-011 y FR-015). Todo con fechas `YYYY-MM-DD` en la zona del APRENDIZ, sumadas en
 * UTC puro: la zona del teléfono no entra en ninguna cuenta, y el reloj del mentor tampoco (el «hoy» lo pone quien llama, desde la
 * zona del aprendiz). La semana del semáforo va de sábado a viernes.
 */

const diaDeLaSemana = (fecha: string): number => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo … 6 = sábado
};

/** El viernes que cierra la semana (sábado a viernes) en la que cae `fecha`. */
export function viernesDeLaSemana(fecha: string): string {
  return sumarDiasIso(fecha, (5 - diaDeLaSemana(fecha) + 7) % 7);
}

/** Los 7 días de la semana que cierra ese viernes, de sábado a viernes. */
export function diasDeLaSemana(viernes: string): string[] {
  const sabado = sumarDiasIso(viernes, -6);
  return Array.from({ length: 7 }, (_, i) => sumarDiasIso(sabado, i));
}

/** La inicial de un día para los círculos: S D L M M J V (de sábado a viernes). */
const INICIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const NOMBRES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const inicialDelDia = (fecha: string): string => INICIALES[diaDeLaSemana(fecha)];
export const numeroDelDia = (fecha: string): number => Number(fecha.slice(8, 10));

/** «Jueves 12 de noviembre», el título del día elegido. */
export function tituloDelDia(fecha: string): string {
  const nombre = NOMBRES[diaDeLaSemana(fecha)];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${numeroDelDia(fecha)} de ${MESES[Number(fecha.slice(5, 7)) - 1]}`;
}

/** «Noviembre»: el mes del enlace que despliega el calendario. */
export function nombreDelMesDe(fecha: string): string {
  const mes = MESES[Number(fecha.slice(5, 7)) - 1];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)}`;
}

/** El primer y el último día del mes de `fecha` (para pedir los colores del mes de un solo pedido). */
export function limitesDelMes(fecha: string): { desde: string; hasta: string; clave: string } {
  const [a, m] = fecha.split('-').map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const clave = fecha.slice(0, 7);
  return { desde: `${clave}-01`, hasta: `${clave}-${String(ultimo).padStart(2, '0')}`, clave };
}

/**
 * Si el mentor puede elegir ese día: desde el Día 1 del programa hasta hoy (FR-015, FR-017). Antes del Día 1 o a futuro va sin
 * color y no se elige. `diaUno` en `null` = todavía no empezó: ningún día se elige.
 */
export function sePuedeElegir(fecha: string, diaUno: string | null, hoy: string): boolean {
  return diaUno !== null && fecha >= diaUno && fecha <= hoy;
}
