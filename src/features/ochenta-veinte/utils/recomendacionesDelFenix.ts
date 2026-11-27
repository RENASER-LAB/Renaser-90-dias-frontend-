import type { ColorPareto, EjeObjetivo, RocaDiariaApi } from '../../objetivos/types/objetivos.types';
import { ETIQUETA_CORTA_EJE } from '../../objetivos/types/objetivos.types';
import { minutosDeLaHora } from '../../training/utils/listaDelDia';
import type { AccionDelOchentaVeinte, VistaDelPeriodo } from '../types/ochentaVeinte.types';

/**
 * Lo que el fénix recomienda en «Tu 80/20» (spec 058 FR-016, 2026-11-26): reglas fijas del cliente con los datos que ya llegan
 * (las acciones de hoy y la lectura de la semana o del mes del 80/20). No hay IA ni servidor nuevo: solo se dicen las cifras que ya están.
 * El objetivo de la hoja es recomendar la acción diaria que genera ese 100 %, para reagendarla, o darle una devolución corta.
 */

export const COLORES: readonly ColorPareto[] = ['VERDE', 'AMARILLA', 'ROJA'];
const NOMBRE_DEL_EJE = (eje: string) => ETIQUETA_CORTA_EJE[eje as EjeObjetivo] ?? eje;

/** Un día antes de `yyyy-MM-dd`, sin pasar por UTC. */
export function diaAnterior(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d - 1, 12);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
}

export function sumarDiasIso(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d + dias, 12);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
}

/* ------------------------------------------------------------------------------------------------
 * HOY
 * ---------------------------------------------------------------------------------------------- */

/** De mayor a menor impacto; a igual impacto, la verde primero. */
export function porOrdenDeImpacto(acciones: readonly RocaDiariaApi[]): RocaDiariaApi[] {
  const rango = (c: ColorPareto) => COLORES.indexOf(c);
  return [...acciones].sort((a, b) => b.puntajeImpacto - a.puntajeImpacto || rango(a.color) - rango(b.color) || a.posicion - b.posicion);
}

/** El peso de cada color: su parte del impacto de las acciones de hoy, en porcentaje entero. Sin acciones, todo en 0. */
export function pesosDeHoy(acciones: readonly RocaDiariaApi[]): Record<ColorPareto, number> {
  const total = acciones.reduce((s, a) => s + Math.max(0, a.puntajeImpacto), 0);
  const peso: Record<ColorPareto, number> = { VERDE: 0, AMARILLA: 0, ROJA: 0 };
  if (total <= 0) return peso;
  for (const color of COLORES) {
    const suma = acciones.filter(a => a.color === color).reduce((s, a) => s + Math.max(0, a.puntajeImpacto), 0);
    peso[color] = Math.round((suma / total) * 100);
  }
  return peso;
}

export type RecomendacionDeHoy =
  | { tipo: 'sin-acciones'; texto: string }
  | { tipo: 'todo-cumplido'; texto: string }
  | { tipo: 'siguiente'; texto: string; accion: RocaDiariaApi }
  /** La verde de ayer no se cumplió: se ofrece reagendarla (abre la hoja de agendar que ya existe). */
  | { tipo: 'reagendar'; texto: string; accion: AccionDelOchentaVeinte };

export const ETIQUETA_DE_LO_QUE_MAS_ACERCA = 'Lo que más te acerca ahora';

export function recomendacionDeHoy(entrada: {
  deHoy: readonly RocaDiariaApi[];
  /** `lasQueSeFueron` de la lectura de la semana: las verdes o de mayor impacto que quedaron pendientes en un día que ya pasó. */
  seFueron: readonly AccionDelOchentaVeinte[];
  eje: EjeObjetivo;
  hoyIso: string | null;
}): RecomendacionDeHoy {
  const { deHoy, seFueron, eje, hoyIso } = entrada;
  const ayer = hoyIso ? diaAnterior(hoyIso) : null;
  const verdeDeAyer = ayer ? seFueron.find(a => a.fecha === ayer && a.color === 'VERDE' && a.eje === eje) : undefined;
  if (verdeDeAyer) {
    return { tipo: 'reagendar', accion: verdeDeAyer, texto: `Ayer no cumpliste «${verdeDeAyer.titulo}», tu verde de ${NOMBRE_DEL_EJE(eje)}. Reagéndala para hoy.` };
  }
  if (deHoy.length === 0) return { tipo: 'sin-acciones', texto: `Hoy no tienes acciones en ${NOMBRE_DEL_EJE(eje)}. Agenda una verde y empieza por ahí.` };
  const pendientes = porOrdenDeImpacto(deHoy.filter(a => !a.completada && !a.bloqueada));
  const siguiente = pendientes[0];
  if (!siguiente) {
    const quedanBloqueadas = deHoy.some(a => !a.completada);
    return {
      tipo: 'todo-cumplido',
      texto: quedanBloqueadas ? 'Cumpliste tu verde. Las demás se desbloquean con ella: sigue con la próxima.' : `Cumpliste todo en ${NOMBRE_DEL_EJE(eje)}. Mañana repite lo que hoy te funcionó.`,
    };
  }
  const hora = minutosDeLaHora(siguiente.horaInicio) === null ? null : (siguiente.horaInicio as string).slice(0, 5);
  return { tipo: 'siguiente', accion: siguiente, texto: `«${siguiente.titulo}»${hora ? ` a las ${hora}` : ''}` };
}

/* ------------------------------------------------------------------------------------------------
 * SEMANA
 * ---------------------------------------------------------------------------------------------- */

export type EstadoDeCelda = 'TODO' | 'VERDE' | 'A_MEDIAS' | 'NADA' | 'POR_VENIR' | 'SIN_DATO';

export const EJES_DE_LA_SEMANA: readonly EjeObjetivo[] = ['CUERPO', 'TRABAJO', 'RELACIONES'];

interface AccionConocida {
  fecha: string;
  eje: string;
  color: string;
  titulo: string;
  cumplida: boolean;
}

/**
 * Las acciones por día y eje que la hoja puede conocer sin pedir nada nuevo: las agendadas que la pantalla ya leyó (hoy, mañana y los días que
 * vienen, con su `completada`) y las de la lectura del 80/20 (las cinco que más movieron, cumplidas, y las cinco que se fueron). El servidor no
 * manda el detalle día por día de los días que ya pasaron: esas celdas, sin ninguna acción conocida, quedan «sin dato» y no se inventan.
 */
export function accionesConocidas(vista: VistaDelPeriodo, agendadas: readonly RocaDiariaApi[]): AccionConocida[] {
  const vistas = new Map<string, AccionConocida>();
  const poner = (a: AccionConocida) => vistas.set(`${a.fecha}|${a.eje}|${a.color}|${a.titulo}`, a);
  for (const a of vista.cifras.lasQueMasMovieron) poner({ fecha: a.fecha, eje: String(a.eje), color: String(a.color), titulo: a.titulo, cumplida: true });
  for (const a of vista.cifras.lasQueSeFueron) poner({ fecha: a.fecha, eje: String(a.eje), color: String(a.color), titulo: a.titulo, cumplida: false });
  for (const a of agendadas) poner({ fecha: a.fecha, eje: a.eje, color: a.color, titulo: a.titulo, cumplida: a.completada });
  return [...vistas.values()];
}

export function estadoDeUnaCelda(acciones: readonly AccionConocida[], fecha: string, hoyIso: string | null): EstadoDeCelda {
  const delDia = acciones.filter(a => a.fecha === fecha);
  if (delDia.length === 0) return 'SIN_DATO';
  const cumplidas = delDia.filter(a => a.cumplida);
  if (cumplidas.length === delDia.length) return 'TODO';
  if (hoyIso && fecha > hoyIso) return 'POR_VENIR';
  if (cumplidas.length === 0) return 'NADA';
  return cumplidas.some(a => a.color === 'VERDE') ? 'VERDE' : 'A_MEDIAS';
}

export interface MapaDeCalor {
  dias: string[];
  filas: { eje: EjeObjetivo; celdas: EstadoDeCelda[] }[];
  /** Cuántas celdas tienen algún dato: con 0, la hoja lo dice en vez de dibujar una grilla vacía. */
  conDato: number;
}

export function mapaDeCalor(vista: VistaDelPeriodo, agendadas: readonly RocaDiariaApi[], hoyIso: string | null): MapaDeCalor {
  /* Solo los días del periodo: una primera semana corta (empezó un jueves) no dibuja los lunes de la que viene. */
  const largo = Math.max(1, Math.min(7, Math.round((Date.parse(`${vista.fin}T12:00:00`) - Date.parse(`${vista.inicio}T12:00:00`)) / 86_400_000) + 1 || 7));
  const dias = Array.from({ length: largo }, (_, i) => sumarDiasIso(vista.inicio, i));
  const conocidas = accionesConocidas(vista, agendadas);
  const filas = EJES_DE_LA_SEMANA.map(eje => ({
    eje,
    celdas: dias.map(fecha => estadoDeUnaCelda(conocidas.filter(a => a.eje === eje), fecha, hoyIso)),
  }));
  return { dias, filas, conDato: filas.reduce((s, f) => s + f.celdas.filter(c => c !== 'SIN_DATO').length, 0) };
}

export type RecomendacionDeLaSemana = { texto: string; ofreceAgendar: boolean };

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function nombreDelDia(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return DIAS[new Date(a, m - 1, d, 12).getDay()];
}

/** La verde que más se repite entre las que se fueron: la que conviene reagendar. */
function verdeQueMasSeRepite(vista: VistaDelPeriodo): AccionDelOchentaVeinte | null {
  const verdes = vista.cifras.lasQueSeFueron.filter(a => a.color === 'VERDE');
  if (verdes.length === 0) return null;
  const veces = new Map<string, number>();
  for (const v of verdes) veces.set(v.titulo, (veces.get(v.titulo) ?? 0) + 1);
  return [...verdes].sort((a, b) => (veces.get(b.titulo) ?? 0) - (veces.get(a.titulo) ?? 0))[0];
}

/** Por orden: un eje sin acciones; la verde que se fue; el eje que más se queda atrás; si no, un «sigue así». */
export function recomendacionDeLaSemana(vista: VistaDelPeriodo, periodo: 'semana' | 'mes' = 'semana'): RecomendacionDeLaSemana {
  const { cifras } = vista;
  const este = periodo === 'mes' ? 'este mes' : 'esta semana';
  if (cifras.planificadas === 0) return { texto: `${periodo === 'mes' ? 'Este mes' : 'Esta semana'} no tiene acciones. Agenda una verde para empezar.`, ofreceAgendar: true };
  const conAcciones = new Set(cifras.porEje.filter(e => e.planificadas > 0).map(e => String(e.eje)));
  const enBlanco = EJES_DE_LA_SEMANA.find(e => !conAcciones.has(e));
  if (enBlanco) return { texto: `${NOMBRE_DEL_EJE(enBlanco)} no tiene acciones ${este}. Agenda una verde para ese eje.`, ofreceAgendar: true };
  const verde = verdeQueMasSeRepite(vista);
  if (verde) return { texto: `Tu verde «${verde.titulo}» se quedó el ${nombreDelDia(verde.fecha)}. Reagéndala para ${este}.`, ofreceAgendar: true };
  const atras = [...cifras.porEje]
    .filter(e => e.planificadas > 0)
    .sort((a, b) => a.cumplidas / a.planificadas - b.cumplidas / b.planificadas)[0];
  if (atras && atras.cumplidas / atras.planificadas < 0.5) {
    return { texto: `${NOMBRE_DEL_EJE(String(atras.eje))} va en ${atras.cumplidas} de ${atras.planificadas}. Reagenda su verde primero.`, ofreceAgendar: true };
  }
  return { texto: 'Vas muy bien. Sigue haciendo tu verde primero cada día.', ofreceAgendar: false };
}

/* ------------------------------------------------------------------------------------------------
 * MES
 * ---------------------------------------------------------------------------------------------- */

export interface ProyeccionDelMes {
  /** Dónde estaría al terminar el mes si sigues al ritmo que llevas (línea recta desde tu punto de partida). */
  proyectado: number;
  llega: boolean;
  /** Lo que faltaría para la meta del mes con ese ritmo (0 si llega). */
  faltaria: number;
}

/**
 * Una línea recta, calculada en el cliente con lo que ya llega: ritmo = (actual − inicio) / días que van del programa;
 * proyectado = inicio + ritmo × el día en que termina el mes. Sin días transcurridos, o sin camino que medir, no hay proyección.
 */
export function proyeccionDelMes(entrada: {
  inicio: number;
  actual: number;
  metaDelMes: number;
  diaPrograma: number;
  diaEnQueTerminaElMes: number;
}): ProyeccionDelMes | null {
  const { inicio, actual, metaDelMes, diaPrograma, diaEnQueTerminaElMes } = entrada;
  if (diaPrograma < 1 || diaEnQueTerminaElMes < 1 || inicio === metaDelMes) return null;
  const ritmo = (actual - inicio) / diaPrograma;
  const proyectado = inicio + ritmo * diaEnQueTerminaElMes;
  const sube = metaDelMes > inicio;
  const llega = sube ? proyectado >= metaDelMes : proyectado <= metaDelMes;
  return { proyectado, llega, faltaria: llega ? 0 : Math.abs(metaDelMes - proyectado) };
}

export function recomendacionDelMes(entrada: { llega: boolean | null; eje: EjeObjetivo; vista: VistaDelPeriodo | null }): string {
  const { llega, eje, vista } = entrada;
  if (llega === true) return 'Vas por buen camino. Sigue con tu verde primero cada día.';
  if (llega === false) return `Para llegar, haz primero tu verde de ${NOMBRE_DEL_EJE(eje)} cada día.`;
  if (vista) return recomendacionDeLaSemana(vista, 'mes').texto;
  return `Haz primero tu verde de ${NOMBRE_DEL_EJE(eje)} cada día.`;
}

/* ------------------------------------------------------------------------------------------------
 * PLANIFICA TUS OBJETIVOS (el engranaje de Plan)
 * ---------------------------------------------------------------------------------------------- */

/**
 * Lo que dice el fénix en «Planifica tus objetivos» (spec 058 FR-017): primero la semana que falta armar, luego los días que quedan sin
 * acciones, y si todo está listo, un cierre corto. Solo lee lo que la hoja ya tiene; las filas siguen llevando a donde siempre.
 */
export function recomendacionDeLaPlanificacion(entrada: {
  ejesSinSemana: readonly EjeObjetivo[];
  /** Días de esta semana que faltan por vivir (hoy incluido) y no tienen ninguna acción agendada. */
  diasSinAccionesPorVenir: number;
}): string {
  const { ejesSinSemana, diasSinAccionesPorVenir } = entrada;
  if (ejesSinSemana.length > 0) {
    const nombres = ejesSinSemana.map(e => NOMBRE_DEL_EJE(e));
    return ejesSinSemana.length === 1 ? `Te falta armar tu semana de ${nombres[0]}.` : `Te falta armar tu semana de ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}.`;
  }
  if (diasSinAccionesPorVenir > 0) {
    return diasSinAccionesPorVenir === 1
      ? 'Te queda 1 día sin acciones. Agenda una verde y lo cierras.'
      : `Te quedan ${diasSinAccionesPorVenir} días sin acciones. Agenda una verde para el próximo.`;
  }
  return 'Tu semana está armada y tu agenda va completa. Ahora toca hacerla.';
}
