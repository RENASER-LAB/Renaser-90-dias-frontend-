import { sumarDias } from './semanasDeHuecos';
import type { ResumenDeHuecos } from '../types/huecos.types';

/**
 * Los textos de la sección «Tiempo libre de la semana», en tipo oración y con tuteo de la app. Todo puro: la
 * pantalla solo los pone. Las fechas se arman con UTC a mano, como `fechasLegibles`: son fechas de calendario.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/** Lunes = 1 … domingo = 7, con la inicial en mayúscula solo al abrir la frase (ver `diasEnPalabras`). */
const DIAS_CORTOS: Record<number, string> = { 1: 'lun', 2: 'mar', 3: 'mié', 4: 'jue', 5: 'vie', 6: 'sáb', 7: 'dom' };

/** `120` → `2 h`; `90` → `1 h 30 min`; `45` → `45 min`; `2870` → `47 h 50 min`. */
export function duracionEnPalabras(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** Lo mismo para el lector de pantalla, que lee «h» como una letra: `90` → `1 hora 30 minutos`. */
export function duracionHablada(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  const h = horas === 1 ? '1 hora' : `${horas} horas`;
  const m = resto === 1 ? '1 minuto' : `${resto} minutos`;
  if (horas === 0) return m;
  return resto === 0 ? h : `${h} ${m}`;
}

/** `Lun, mié y jue`; `Sáb y dom`; `Lun`; los siete: `Todos los días`. */
export function diasEnPalabras(dias: readonly number[]): string {
  const nombres = dias.filter(d => d in DIAS_CORTOS).map(d => DIAS_CORTOS[d]);
  if (nombres.length === 0) return '';
  if (nombres.length === 7) return 'Todos los días';
  const frase = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

/** `15:00–17:00`. */
export function tramoEnPalabras(desde: string, hasta: string): string {
  return `${desde}–${hasta}`;
}

/**
 * Lo real de la semana: `32 a tiempo · 6 tarde · 4 sin cumplir`. `null` cuando no hay nada que contar (los tres en
 * cero o sin dato): una semana por venir no tiene «lo real» y escribir ceros parecería un resultado.
 */
export function lineaDeLoReal(resumen: Pick<ResumenDeHuecos, 'cumplidosATiempo' | 'cumplidosTarde' | 'noCumplidos'>): string | null {
  const aTiempo = resumen.cumplidosATiempo ?? 0;
  const tarde = resumen.cumplidosTarde ?? 0;
  const sinCumplir = resumen.noCumplidos ?? 0;
  if (aTiempo + tarde + sinCumplir === 0) return null;
  return `${aTiempo} a tiempo · ${tarde} tarde · ${sinCumplir} sin cumplir`;
}

/**
 * Qué semana es: la cerrada tiene su foto guardada («Semana cerrada»); la que va corriendo, «Semana en curso». Cualquier
 * otra (una anterior que el servidor calculó al pedirla, o mientras se lee) es solo «Semana»: no se afirma lo que no se sabe.
 */
export function tituloDeLaSemana({ cerrada, esLaEnCurso }: { cerrada: boolean; esLaEnCurso: boolean }): string {
  if (cerrada) return 'Semana cerrada';
  return esLaEnCurso ? 'Semana en curso' : 'Semana';
}

/** `Del 26 de octubre al 1 de noviembre`, desde el lunes. La cadena vacía si la fecha no se lee. */
export function rangoDeLaSemana(lunes: string): string {
  const inicio = new Date(`${lunes}T00:00:00Z`);
  if (Number.isNaN(inicio.getTime())) return '';
  const fin = new Date(`${sumarDias(lunes, 6)}T00:00:00Z`);
  return `Del ${inicio.getUTCDate()} de ${MESES[inicio.getUTCMonth()]} al ${fin.getUTCDate()} de ${MESES[fin.getUTCMonth()]}`;
}

/** `2026-10-26` → `Lunes 26`. La cadena original si no se puede leer. */
export function diaCorto(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DIAS_LARGOS[d.getUTCDay()]} ${d.getUTCDate()}`;
}
