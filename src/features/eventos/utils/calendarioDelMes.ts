import type { Ocurrencia } from '../types/eventos.types';
import { fechaEnZona, instanteEnZona, sumarDiasIso } from './zonaHoraria';

/**
 * El calendario del mes de Comunidad → Eventos (pedido del dueño del 2026-09-26: «la parte de eventos
 * debe ser tipo calendario del mes»). Lógica pura, sin React, para poder probarla.
 *
 * **Los días son de la zona del evento, nunca de UTC** (misma lección que E-91 en el backend): una
 * clase a las 21:00 de Lima es a las 02:00 UTC del día siguiente, y si se agrupara por `toISOString()`
 * aparecería marcada un día después. Cada ocurrencia se ubica con `fechaEnZona(iniciaEn, zona)`.
 *
 * Las fechas viajan como `YYYY-MM-DD` y se suman con `sumarDiasIso` (en UTC puro): la zona del
 * teléfono no entra en ninguna cuenta de la grilla.
 */

/** Un mes del calendario. `mes` va de 1 a 12. */
export interface Mes {
  anio: number;
  mes: number;
}

export interface CeldaDelDia {
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** El número que se dibuja (1..31). */
  dia: number;
  /** `false` para los días del mes anterior o siguiente que completan la primera y la última semana. */
  delMes: boolean;
}

/** Cómo se marca un día en la grilla. `vas` gana sobre `hay`: si vas a uno, eso es lo que importa. */
export type MarcaDelDia = 'vas' | 'hay' | null;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Las iniciales de la semana, de lunes a domingo (así se lee un calendario en Perú). */
export const DIAS_DE_LA_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
/** Lo mismo, completo, para el lector de pantalla. */
export const DIAS_DE_LA_SEMANA_COMPLETOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

const dos = (n: number) => String(n).padStart(2, '0');

/** El mes de una fecha `YYYY-MM-DD`. */
export function mesDeLaFecha(fechaIso: string): Mes {
  const [anio, mes] = fechaIso.split('-').map(Number);
  return { anio, mes };
}

/** `delta` meses después (o antes, si es negativo). */
export function moverMes(m: Mes, delta: number): Mes {
  const indice = m.anio * 12 + (m.mes - 1) + delta;
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

export function mismoMes(a: Mes, b: Mes): boolean {
  return a.anio === b.anio && a.mes === b.mes;
}

/** `YYYY-MM-01`. */
export function primerDiaDelMes(m: Mes): string {
  return `${m.anio}-${dos(m.mes)}-01`;
}

/** «Septiembre 2026». */
export function nombreDelMes(m: Mes): string {
  return `${MESES[m.mes - 1]} ${m.anio}`;
}

/** Solo el nombre: «Septiembre». */
export function soloElMes(m: Mes): string {
  return MESES[m.mes - 1];
}

function diasDelMes(m: Mes): number {
  return new Date(Date.UTC(m.anio, m.mes, 0)).getUTCDate();
}

/** 0 = lunes … 6 = domingo. */
function columnaDeLaSemana(fechaIso: string): number {
  const [a, m, d] = fechaIso.split('-').map(Number);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
}

/**
 * La grilla del mes, de lunes a domingo: entre 4 y 6 semanas, las que haga falta. La primera semana
 * arranca con los últimos días del mes anterior y la última termina con los primeros del siguiente
 * (se dibujan apagados).
 */
export function grillaDelMes(m: Mes): CeldaDelDia[][] {
  const primero = primerDiaDelMes(m);
  const inicio = sumarDiasIso(primero, -columnaDeLaSemana(primero));
  const ultimo = `${m.anio}-${dos(m.mes)}-${dos(diasDelMes(m))}`;
  const fin = sumarDiasIso(ultimo, 6 - columnaDeLaSemana(ultimo));

  const semanas: CeldaDelDia[][] = [];
  for (let fecha = inicio; fecha <= fin; ) {
    const semana: CeldaDelDia[] = [];
    for (let i = 0; i < 7; i++) {
      const [anio, mes, dia] = fecha.split('-').map(Number);
      semana.push({ fecha, dia, delMes: anio === m.anio && mes === m.mes });
      fecha = sumarDiasIso(fecha, 1);
    }
    semanas.push(semana);
  }
  return semanas;
}

/**
 * Qué rango pedirle al backend para llenar la grilla visible. Va de la medianoche del primer día
 * dibujado a la del día siguiente al último, en `zona`, **con un día de margen a cada lado**: un
 * evento creado en otra zona puede caer, en la suya, en un día de la grilla aunque en la nuestra caiga
 * fuera. Lo que sobra no molesta: la grilla solo dibuja sus días.
 */
export function rangoDelPedido(m: Mes, zona: string): { desde: Date; hasta: Date } {
  const semanas = grillaDelMes(m);
  const primero = semanas[0][0].fecha;
  const ultimo = semanas[semanas.length - 1][6].fecha;
  const desde = instanteEnZona(sumarDiasIso(primero, -1), '00:00', zona) as number;
  const hasta = instanteEnZona(sumarDiasIso(ultimo, 2), '00:00', zona) as number;
  return { desde: new Date(desde), hasta: new Date(hasta) };
}

/** El día (`YYYY-MM-DD`) de una ocurrencia, en la zona del evento (o en `zonaPorDefecto` si no trae). */
export function diaDeLaOcurrencia(oc: Ocurrencia, zonaPorDefecto: string): string {
  return fechaEnZona(oc.iniciaEn, oc.evento.zona ?? zonaPorDefecto);
}

/** Las ocurrencias agrupadas por su día local, cada grupo ordenado por hora. */
export function agruparPorDia(ocurrencias: Ocurrencia[], zonaPorDefecto: string): Record<string, Ocurrencia[]> {
  const porDia: Record<string, Ocurrencia[]> = {};
  for (const oc of ocurrencias) {
    const dia = diaDeLaOcurrencia(oc, zonaPorDefecto);
    (porDia[dia] ??= []).push(oc);
  }
  for (const dia of Object.keys(porDia)) {
    porDia[dia].sort((a, b) => Date.parse(a.iniciaEn) - Date.parse(b.iniciaEn));
  }
  return porDia;
}

/** Solo aquellas a las que la persona dijo «Voy». */
export function soloLasQueVas(ocurrencias: Ocurrencia[]): Ocurrencia[] {
  return ocurrencias.filter(oc => oc.asistencia === 'GOING');
}

export function marcaDelDia(ocurrencias: Ocurrencia[] | undefined): MarcaDelDia {
  if (!ocurrencias || ocurrencias.length === 0) return null;
  return ocurrencias.some(oc => oc.asistencia === 'GOING') ? 'vas' : 'hay';
}

/**
 * Qué día queda elegido al abrir un mes: hoy, si hoy es de ese mes; si no, el primer día del mes con
 * eventos; si no hay ninguno, ninguno (la vista dice «Toca un día…»).
 */
export function diaElegidoAlAbrir(m: Mes, hoyIso: string, porDia: Record<string, Ocurrencia[]>): string | null {
  if (mismoMes(mesDeLaFecha(hoyIso), m)) return hoyIso;
  const conEventos = Object.keys(porDia)
    .filter(dia => mismoMes(mesDeLaFecha(dia), m))
    .sort();
  return conEventos[0] ?? null;
}

/**
 * Lo que muestran las tarjetas «como cursos»: lo que todavía no terminó, por hora. Un evento que
 * empezó hace un rato sigue (es «al que me uno»); sin duración se le da una hora.
 */
export function proximasParaTarjetas(ocurrencias: Ocurrencia[], ahoraMs: number): Ocurrencia[] {
  return ocurrencias
    .filter(oc => {
      const inicio = Date.parse(oc.iniciaEn);
      const minutos = oc.duracionMinutos && oc.duracionMinutos > 0 ? oc.duracionMinutos : 60;
      return Number.isFinite(inicio) && inicio + minutos * 60_000 > ahoraMs;
    })
    .sort((a, b) => Date.parse(a.iniciaEn) - Date.parse(b.iniciaEn));
}

/**
 * Las tarjetas se agrupan por mes («Septiembre», «Octubre»), como un catálogo. El mes es el del día
 * local del evento.
 */
export function agruparPorMes(
  ocurrencias: Ocurrencia[],
  zonaPorDefecto: string,
): { mes: Mes; ocurrencias: Ocurrencia[] }[] {
  const grupos: { mes: Mes; ocurrencias: Ocurrencia[] }[] = [];
  for (const oc of ocurrencias) {
    const mes = mesDeLaFecha(diaDeLaOcurrencia(oc, zonaPorDefecto));
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && mismoMes(ultimo.mes, mes)) ultimo.ocurrencias.push(oc);
    else grupos.push({ mes, ocurrencias: [oc] });
  }
  return grupos;
}
