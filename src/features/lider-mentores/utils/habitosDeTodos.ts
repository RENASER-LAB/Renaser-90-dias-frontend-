import type { FormacionDeLaSesion } from '../../formaciones/types/formaciones.types';
import { etiquetaDeCategoria } from '../../habits/api/habitsMappers';
import { tituloEnTipoOracion } from '../../habits/utils/tituloEnTipoOracion';
import { formatearNumero } from '../../objetivos/utils/cifraDelObjetivo';
import type { InicioSemanal } from '../../semaforo/hooks/useLecturaPorSemana';
import type {
  EstadoEnUnHabito,
  HabitoDeTodos,
  HabitosDeTodos,
  PersonaEnUnHabito,
  TotalesDelDia,
} from '../types/habitosDeTodos.types';

/**
 * Los textos y las reglas de «Hábitos de todos» (spec 029), puros para probarse sin montar la pantalla. Nada de lo que se dice
 * acá es un cálculo propio: las cifras, el orden y los estados los manda el servidor; la app los nombra.
 */

/** El valor de `group` que pide a los alumnos sin ningún grupo. */
export const SIN_GRUPO = 'none';

export const TEXTO_SIN_HABITOS = 'Ese día nadie tenía hábitos por cumplir.';
export const TEXTO_SIN_COINCIDENCIAS = 'Ningún alumno coincide con estos filtros.';

// ─── Fechas ────────────────────────────────────────────────────────────────

function partes(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** Suma (o resta) días a un `YYYY-MM-DD` sin pasar por la zona del teléfono. */
export function sumarDias(iso: string, dias: number): string {
  const { y, m, d } = partes(iso);
  const fecha = new Date(Date.UTC(y, m - 1, d + dias));
  return fecha.toISOString().slice(0, 10);
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** El día de la semana (0 = domingo) de un `YYYY-MM-DD`. */
export function diaDeLaSemana(iso: string): number {
  const { y, m, d } = partes(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * El rótulo del día: «Hoy», «Ayer» o «Mar 27 oct». «Hoy» es el último día que se puede mirar (`masReciente`, el que dice el servidor);
 * sin ese dato solo se puede decir «Hoy» si el servidor lo marcó.
 */
export function rotuloDelDia(fecha: string, masReciente: string | null, esHoy: boolean): string {
  if (esHoy || fecha === masReciente) return 'Hoy';
  if (masReciente && fecha === sumarDias(masReciente, -1)) return 'Ayer';
  const { m, d } = partes(fecha);
  return `${DIAS_CORTOS[diaDeLaSemana(fecha)]} ${d} ${MESES_CORTOS[m - 1]}`;
}

/** Lo que oye quien no ve: el día completo («martes 27 de octubre»). */
export function diaCompletoEnPalabras(fecha: string): string {
  const nombres = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const { m, d } = partes(fecha);
  return `${nombres[diaDeLaSemana(fecha)]} ${d} de ${meses[m - 1]}`;
}

export interface Navegacion {
  /** El día de antes; `null` = ya se llegó al límite (7 días atrás) o todavía no se sabe. */
  anterior: string | null;
  /** El día de después; `null` = hoy (nunca el futuro) o todavía no se sabe. */
  siguiente: string | null;
}

/** ‹ y ›: solo dentro de [más antigua, más reciente] que dice el servidor. Sin esos límites no se mueve nada (no se adivina el «hoy»). */
export function navegacionDelDia(fecha: string | null, masAntigua: string | null, masReciente: string | null): Navegacion {
  if (!fecha || !masAntigua || !masReciente) return { anterior: null, siguiente: null };
  const antes = sumarDias(fecha, -1);
  const despues = sumarDias(fecha, 1);
  return {
    anterior: antes >= masAntigua ? antes : null,
    siguiente: despues <= masReciente ? despues : null,
  };
}

// ─── Estados y textos ──────────────────────────────────────────────────────

/** El estado en palabras. Con `SIN_DATOS` dice por qué, y nunca como una falta. */
export function estadoEnPalabras(persona: Pick<PersonaEnUnHabito, 'estado' | 'motivo'>): string {
  switch (persona.estado) {
    case 'CUMPLIDO':
      return 'Cumplió';
    case 'PENDIENTE':
      return 'Pendiente';
    case 'SIN_CUMPLIR':
      return 'Sin cumplir';
    case 'SIN_DATOS':
      return persona.motivo === 'ANTES_DEL_DIA_1' ? 'Todavía no empezaba' : 'No le tocaba o en pausa';
  }
}

export interface SeccionDePersonas {
  estado: EstadoEnUnHabito;
  titulo: string;
  personas: PersonaEnUnHabito[];
  /** Plegada al abrir: las personas sin nada que medir no son a quienes hay que escribirles. */
  plegadaAlAbrir: boolean;
}

const TITULO_DE_LA_SECCION: Record<EstadoEnUnHabito, string> = {
  SIN_CUMPLIR: 'Sin cumplir',
  PENDIENTE: 'Pendientes',
  CUMPLIDO: 'Cumplieron',
  SIN_DATOS: 'No les tocaba o en pausa',
};

const ORDEN_DE_LAS_SECCIONES: readonly EstadoEnUnHabito[] = ['SIN_CUMPLIR', 'PENDIENTE', 'CUMPLIDO', 'SIN_DATOS'];

/** Las personas agrupadas por estado, en el orden de la lista; una sección vacía no se dibuja. El orden dentro de cada una es el del servidor. */
export function seccionesDeLasPersonas(personas: readonly PersonaEnUnHabito[]): SeccionDePersonas[] {
  return ORDEN_DE_LAS_SECCIONES.map(estado => ({
    estado,
    titulo: TITULO_DE_LA_SECCION[estado],
    personas: personas.filter(p => p.estado === estado),
    plegadaAlAbrir: estado === 'SIN_DATOS',
  })).filter(seccion => seccion.personas.length > 0);
}

/** Suma una página a lo ya leído sin repetir a nadie (si alguien cambia de estado entre dos páginas, la frontera se corre). */
export function sumarPersonas(previas: PersonaEnUnHabito[], nuevas: PersonaEnUnHabito[]): PersonaEnUnHabito[] {
  const vistos = new Set(previas.map(p => p.personaId));
  return [...previas, ...nuevas.filter(p => !vistos.has(p.personaId))];
}

function plural(n: number, uno: string, varios: string): string {
  return `${formatearNumero(n)} ${n === 1 ? uno : varios}`;
}

/** «118 de 120 alumnos con hábitos · 940 de 1 500 cumplidos». Sin hábitos que cumplir ese día no hay cifras que inventar. */
export function resumenDelDiaEnPalabras(totales: TotalesDelDia): string {
  if (totales.esperados === 0) return 'Nadie tenía hábitos por cumplir';
  const alumnos = totales.alumnos > 0 ? `${formatearNumero(totales.conHabitos)} de ${plural(totales.alumnos, 'alumno', 'alumnos')} con hábitos · ` : '';
  return `${alumnos}${formatearNumero(totales.cumplieron)} de ${formatearNumero(totales.esperados)} cumplidos`;
}

/** «Cumplieron 41 de 100 · 50 pendientes» (hoy) o «Cumplieron 41 de 100 · 9 sin cumplir» (un día cerrado). */
export function lineaDelHabito(habito: HabitoDeTodos, esHoy: boolean): string {
  const base = `Cumplieron ${formatearNumero(habito.cumplieron)} de ${formatearNumero(habito.esperados)}`;
  const pendientes = habito.pendientes > 0 ? plural(habito.pendientes, 'pendiente', 'pendientes') : null;
  const sinCumplir = habito.sinCumplir > 0 ? `${formatearNumero(habito.sinCumplir)} sin cumplir` : null;
  const resto = (esHoy ? [pendientes, sinCumplir] : [sinCumplir, pendientes]).filter(Boolean);
  return resto.length > 0 ? `${base} · ${resto.join(' · ')}` : base;
}

/** Cuánto del total cumplió, de 0 a 1, para la barra fina. */
export function fraccionCumplida(habito: Pick<HabitoDeTodos, 'cumplieron' | 'esperados'>): number {
  return habito.esperados > 0 ? Math.min(1, habito.cumplieron / habito.esperados) : 0;
}

/** El nombre del hábito en tipo oración (el título del catálogo; el nombre propio de una bebida no se usa acá). */
export function nombreDelHabito(habito: Pick<HabitoDeTodos, 'titulo'>): string {
  return tituloEnTipoOracion(habito.titulo);
}

/** La dimensión del hábito en palabras: la que manda el servidor, o una de las cuatro conocidas; si no, nada (no se inventa). */
export function dimensionDelHabito(habito: Pick<HabitoDeTodos, 'categoria' | 'nombreDeLaCategoria'>): string | null {
  return habito.nombreDeLaCategoria ?? etiquetaDeCategoria(habito.categoria);
}

/** Lo que oye quien no ve en la fila de un hábito. */
export function dichoDelHabito(habito: HabitoDeTodos, esHoy: boolean): string {
  const dimension = dimensionDelHabito(habito);
  return `${nombreDelHabito(habito)}.${dimension ? ` ${dimension}.` : ''} ${lineaDelHabito(habito, esHoy)}. Ver los alumnos.`;
}

/** La línea de una persona: su grupo y, si hay, la hora planificada y la de cumplimiento. */
export function lineaDeLaPersona(persona: PersonaEnUnHabito): string {
  const grupo = persona.grupoNombre ?? (persona.grupoId ? 'Grupo sin nombre' : 'Sin grupo');
  const horas = [
    persona.horaPlanificada ? `Planificado ${persona.horaPlanificada}` : null,
    persona.cumplioA ? `Cumplió ${persona.cumplioA}` : null,
  ].filter(Boolean);
  return [grupo, ...horas].join(' · ');
}

export function dichoDeLaPersona(persona: PersonaEnUnHabito): string {
  return `${persona.nombre}. ${estadoEnPalabras(persona)}. ${lineaDeLaPersona(persona)}. Ver su ficha.`;
}

// ─── Filtros ───────────────────────────────────────────────────────────────

export interface OpcionDeDimension {
  clave: string;
  etiqueta: string;
}

/**
 * Las dimensiones que se pueden elegir: las que ya se vieron en la pantalla (la unión de lo leído, para que al filtrar por una
 * no desaparezcan las otras), con su nombre. Una dimensión sin nombre conocido no se ofrece: no se inventan etiquetas.
 */
export function sumarDimensiones(previas: readonly OpcionDeDimension[], habitos: readonly HabitoDeTodos[]): OpcionDeDimension[] {
  const claves = new Set(previas.map(o => o.clave));
  const nuevas: OpcionDeDimension[] = [];
  for (const habito of habitos) {
    const etiqueta = dimensionDelHabito(habito);
    if (habito.categoriaClave && etiqueta && !claves.has(habito.categoriaClave)) {
      claves.add(habito.categoriaClave);
      nuevas.push({ clave: habito.categoriaClave, etiqueta });
    }
  }
  return nuevas.length > 0 ? [...previas, ...nuevas] : [...previas];
}

/**
 * El filtro «Formación» solo existe para quien ve más de una formación a la vez (Administración y Alquimista: `veTodas`). Una
 * persona con una sola no ve la palabra «formación» ni el filtro. El personal con varias solo ve la ACTIVA (lo decide el servidor),
 * y la cambia desde Yo: ofrecerle un filtro que da siempre una lista vacía sería confuso.
 */
export function seOfreceElFiltroDeFormacion(formacion: FormacionDeLaSesion | null | undefined): boolean {
  return Boolean(formacion?.veTodas);
}

export function hayFiltros(filtros: { grupo: string | null; formacion: string | null; categoria: string | null }): boolean {
  return filtros.grupo !== null || filtros.formacion !== null || filtros.categoria !== null;
}

/** Lo que dice la lista de hábitos cuando no hay filas: nadie tenía hábitos, o los filtros no dejan a nadie. */
export function textoSinHabitos(conFiltros: boolean): string {
  return conFiltros ? TEXTO_SIN_COINCIDENCIAS : TEXTO_SIN_HABITOS;
}

// ─── La ficha, en el mismo día ─────────────────────────────────────────────

/**
 * Cómo abrir la ficha de una persona (`PersonaDelLiderScreen`) para que contenga el día que se estaba mirando. La ficha lee la ventana
 * vigente (los 7 días que terminan AYER) o, con un viernes, esa semana de sábado a viernes. Por eso:
 *  - un día anterior a hoy (hasta 7 atrás) cae en la ventana vigente: no hace falta pedir otra;
 *  - hoy solo cabe si hoy es viernes (la semana que termina hoy); si no, la ficha abre en la ventana vigente y el día queda
 *    en el más reciente con hábitos (la ficha no puede mostrar el día en curso fuera de ese caso).
 */
export function fichaParaElDia(dia: Pick<HabitosDeTodos, 'fecha' | 'esHoy'>): { inicio: InicioSemanal | undefined; diaInicial: string } {
  const esViernes = diaDeLaSemana(dia.fecha) === 5;
  if (dia.esHoy && esViernes) {
    return { inicio: { posicion: { modo: 'semana', semanaHasta: dia.fecha }, hastaVigente: null }, diaInicial: dia.fecha };
  }
  return { inicio: undefined, diaInicial: dia.fecha };
}
