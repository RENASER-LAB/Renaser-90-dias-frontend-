import type { DefinicionRocaMaestra, EjeObjetivo } from '../types/objetivos.types';

/**
 * El formulario «Define tu objetivo» en tres pasos (spec 058 FR-015, 2026-11-26): qué quieres lograr, cómo lo medirás y desde dónde
 * partes hasta dónde quieres llegar. Todo es presentación: lo que se guarda sigue siendo el mismo `PUT /rocks/master/{eje}` con los
 * mismos campos (objetivo, meta, avance, unidad, lineaBase). «Vas en» al crear es igual a «Partiste de»: no se pide.
 * Ideas y unidades son texto fijo del cliente; no salen del servidor.
 */

export const IDEAS_POR_EJE: Record<EjeObjetivo, readonly string[]> = {
  CUERPO: ['Bajar de peso', 'Entrenar más días', 'Dormir mejor', 'Correr una distancia'],
  TRABAJO: ['Subir mis ingresos', 'Conseguir clientes', 'Vender más'],
  RELACIONES: ['Más tiempo en familia', 'Mejorar mi pareja', 'Ver a mis amigos'],
};

/** La unidad llega al servidor con tope de 20 caracteres: todas caben. */
export const UNIDADES_POR_EJE: Record<EjeObjetivo, readonly string[]> = {
  CUERPO: ['kg', 'días por semana', 'horas de sueño', 'km'],
  TRABAJO: ['S/ al mes', 'clientes', 'ventas'],
  RELACIONES: ['veces por semana', 'horas por semana', 'días al mes'],
};

export const MAXIMO_DE_LA_UNIDAD = 20;

/** «82», «2,5»: coma o punto; `null` si no es un número. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** Un número como se lee en Perú: coma decimal y hasta un decimal («2,5», «82»). */
export function numeroEscrito(n: number): string {
  const redondo = Math.round(n * 10) / 10;
  return String(redondo).replace('.', ',');
}

/** Las unidades que ya dicen «por semana», «al mes» o «de sueño» no llevan «por mes» detrás: sería un trabalenguas. */
function esUnidadDeRitmo(unidad: string): boolean {
  return /( por | al | de )/.test(` ${unidad} `);
}

/** Cuántos meses de 30 días tiene el plazo (mínimo 1). */
export function mesesDelPlazo(duracionDias?: number | null): number {
  const dias = typeof duracionDias === 'number' && duracionDias > 0 ? duracionDias : 90;
  return Math.max(1, dias / 30);
}

/** «Tu objetivo: bajar de 82 a 76 kg en 90 días. Son unos 2 kg por mes.» Sin números válidos, `null`. */
export function fraseDelObjetivo(entrada: {
  base: string;
  meta: string;
  unidad: string;
  plazo: string;
  duracionDias?: number | null;
}): string | null {
  const base = leerNumero(entrada.base);
  const meta = leerNumero(entrada.meta);
  const unidad = entrada.unidad.trim();
  if (base === null || meta === null || unidad === '' || base === meta) return null;
  const verbo = meta < base ? 'bajar' : 'subir';
  const principal = `Tu objetivo: ${verbo} de ${numeroEscrito(base)} a ${numeroEscrito(meta)} ${unidad} en ${entrada.plazo}.`;
  if (esUnidadDeRitmo(unidad)) return principal;
  const porMes = Math.abs(meta - base) / mesesDelPlazo(entrada.duracionDias);
  return `${principal} Son unos ${numeroEscrito(porMes)} ${unidad} por mes.`;
}

export type PasoDelObjetivo = 1 | 2 | 3;

/** El título de cada paso; el del primero nombra el eje («¿Qué quieres lograr en tu cuerpo?»). */
export const PREGUNTA_DEL_PASO_1: Record<EjeObjetivo, string> = {
  CUERPO: '¿Qué quieres lograr en tu cuerpo?',
  TRABAJO: '¿Qué quieres lograr en tu negocio?',
  RELACIONES: '¿Qué quieres lograr en tus relaciones?',
};
export const PREGUNTA_DEL_PASO_2 = '¿Cómo vas a medirlo?';
export const PREGUNTA_DEL_PASO_3 = '¿Desde dónde partes y a dónde quieres llegar?';

export type ResultadoDelPaso = { ok: true } | { ok: false; titulo: string; mensaje: string };

export function validarObjetivo(texto: string): ResultadoDelPaso {
  if (texto.trim() === '') return { ok: false, titulo: 'Falta tu objetivo', mensaje: 'Elige una idea o escribe qué quieres lograr.' };
  return { ok: true };
}

export function validarUnidad(unidad: string): ResultadoDelPaso {
  if (unidad.trim() === '') return { ok: false, titulo: 'Falta la unidad', mensaje: 'Elige cómo lo vas a medir o toca «No se mide con un número».' };
  return { ok: true };
}

/** Los mismos rechazos que ya hacía el formulario de una caja (y que el servidor repite con 400). */
export function validarNumeros(base: string, meta: string): ResultadoDelPaso {
  const b = leerNumero(base);
  const m = leerNumero(meta);
  if (b === null || m === null) return { ok: false, titulo: 'Número inválido', mensaje: 'Escribe los dos números: desde dónde partes y a dónde quieres llegar.' };
  if (b < 0) return { ok: false, titulo: 'Punto de partida inválido', mensaje: 'Tiene que ser un número, y no puede ser negativo.' };
  if (m < 0) return { ok: false, titulo: 'Meta inválida', mensaje: 'La meta no puede ser un número negativo.' };
  if (b === m) return { ok: false, titulo: 'Punto de partida igual a la meta', mensaje: 'Si arrancas justo en tu meta no hay avance que medir. Revisa los dos números.' };
  return { ok: true };
}

/** El pedido de siempre. Con número, «Vas en» = «Partiste de»; sin número, solo la declaración (objetivo cualitativo). */
export function definicionDelObjetivo(entrada: { objetivo: string; sinNumero: boolean; unidad: string; base: string; meta: string }): DefinicionRocaMaestra {
  const objetivo = entrada.objetivo.trim();
  if (entrada.sinNumero) return { objetivo };
  const base = leerNumero(entrada.base) as number;
  const meta = leerNumero(entrada.meta) as number;
  return { objetivo, meta, avance: base, unidad: entrada.unidad.trim(), lineaBase: base };
}

/** Cuánto del camino llevas, de 0 a 100, y cuánto es (valor absoluto): para «Llevas 1,5 de 6 kg · 25 %». */
export function avanceDelCamino(base: number, meta: number, actual: number): { recorrido: number; total: number; porcentaje: number } | null {
  if (base === meta) return null;
  const total = Math.abs(meta - base);
  const firmado = meta > base ? actual - base : base - actual;
  const recorrido = Math.max(0, Math.min(total, firmado));
  return { recorrido, total, porcentaje: Math.round((recorrido / total) * 100) };
}

export function lineaDelAvance(base: number | null, meta: number, unidad: string, actual: string): string | null {
  const a = leerNumero(actual);
  if (base === null || a === null) return null;
  const camino = avanceDelCamino(base, meta, a);
  if (!camino) return null;
  return `Llevas ${numeroEscrito(camino.recorrido)} de ${numeroEscrito(camino.total)} ${unidad} · ${camino.porcentaje} %`;
}
