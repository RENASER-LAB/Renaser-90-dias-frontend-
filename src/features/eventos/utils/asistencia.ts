import { normalizeText } from '../../../services/phoneCountriesService';
import type {
  EstadoDeLlegada,
  ListaDeAsistencia,
  PersonaDeLaLista,
  PersonaQueRespondio,
  RespuestaAnterior,
} from '../types/asistencia.types';
import { fechaEnZona, horaEnZona } from './zonaHoraria';

/**
 * Reglas y textos de «Quién respondió» y «Pasar lista» (D-256, 2026-10-06). Funciones puras: las
 * pantallas solo dibujan lo que sale de acá.
 */

/**
 * Regla del dueño (literal): ven los confirmados y pasan lista «quien creó el evento + Admin,
 * Alquimista y Líder de mentores». Decide qué se MUESTRA; el servidor vuelve a autorizar cada llamada.
 */
const ROLES_QUE_VEN: ReadonlySet<string> = new Set(['ADMIN', 'ALCHEMIST', 'MENTOR_LEAD']);

export function puedeVerAsistencia(rol: string | null | undefined, userId: string | null, creadoPor: string | null): boolean {
  if (rol && ROLES_QUE_VEN.has(rol.trim().toUpperCase())) return true;
  return !!userId && !!creadoPor && userId === creadoPor;
}

export interface RespuestasAgrupadas<T> {
  van: T[];
  noVan: T[];
  /** Incluye «Quizás»: la app no lo ofrece, así que para quien mira es no haber respondido. */
  sinRespuesta: T[];
}

export function agruparRespuestas<T extends { respuesta: PersonaQueRespondio['respuesta'] }>(
  personas: readonly T[],
): RespuestasAgrupadas<T> {
  return {
    van: personas.filter(p => p.respuesta === 'GOING'),
    noVan: personas.filter(p => p.respuesta === 'NOT_GOING'),
    sinRespuesta: personas.filter(p => p.respuesta !== 'GOING' && p.respuesta !== 'NOT_GOING'),
  };
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function diaDeLaSemana(fechaIso: string): number {
  const [a, m, d] = fechaIso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** «sáb 3, 18:42», en la zona del evento. */
export function fechaCorta(instante: string, zona: string | null): string {
  const fecha = fechaEnZona(instante, zona);
  return `${DIAS_CORTOS[diaDeLaSemana(fecha)]} ${Number(fecha.slice(8, 10))}, ${horaEnZona(instante, zona)}`;
}

/** «lun 5 oct, 20:00», para el subtítulo de la lista cerrada y el texto que se comparte. */
export function fechaConMes(instante: string, zona: string | null): string {
  const fecha = fechaEnZona(instante, zona);
  const mes = MESES_CORTOS[Number(fecha.slice(5, 7)) - 1];
  return `${DIAS_CORTOS[diaDeLaSemana(fecha)]} ${Number(fecha.slice(8, 10))} ${mes}, ${horaEnZona(instante, zona)}`;
}

function dijo(respuesta: PersonaQueRespondio['respuesta']): string | null {
  if (respuesta === 'GOING') return 'Dijo «Voy»';
  if (respuesta === 'NOT_GOING') return 'Dijo «No voy»';
  return null;
}

/** «Dijo «Voy» · sáb 3, 18:42», o «No respondió». */
export function textoDeRespuesta(p: PersonaQueRespondio, zona: string | null): string {
  const texto = dijo(p.respuesta);
  if (!texto) return 'No respondió';
  return p.respondidaEn ? `${texto} · ${fechaCorta(p.respondidaEn, zona)}` : texto;
}

/**
 * Lo último que dijo ANTES de su respuesta de hoy, si era otra cosa («Voy» ↔ «No voy»). El historial
 * empieza con la V93: sin historia no se inventa nada.
 */
export function respuestaAnterior(p: PersonaQueRespondio): RespuestaAnterior | null {
  const previas = p.historial.slice(0, -1).reverse();
  return previas.find(h => (h.respuesta === 'GOING' || h.respuesta === 'NOT_GOING') && h.respuesta !== p.respuesta) ?? null;
}

/** «Antes dijo «No voy» (sáb 3, 21:05)». */
export function textoDeAntes(anterior: RespuestaAnterior, zona: string | null): string {
  const que = anterior.respuesta === 'GOING' ? '«Voy»' : '«No voy»';
  return `Antes dijo ${que} (${fechaCorta(anterior.en, zona)})`;
}

/** Un toque: sin marcar → a tiempo → tarde → sin marcar. Mantener presionado va directo a tarde. */
export function siguienteLlegada(actual: EstadoDeLlegada): EstadoDeLlegada {
  if (actual === null) return 'A_TIEMPO';
  if (actual === 'A_TIEMPO') return 'TARDE';
  return null;
}

/** Lo que dice la fila mientras se pasa lista. */
export function textoEnLaLista(p: PersonaDeLaLista, zona: string | null): string {
  if (p.llegada === 'A_TIEMPO') return p.marcadaEn ? `A tiempo · ${horaEnZona(p.marcadaEn, zona)}` : 'A tiempo';
  if (p.llegada === 'TARDE') return p.marcadaEn ? `Tarde · ${horaEnZona(p.marcadaEn, zona)}` : 'Tarde';
  return dijo(p.respuesta) ?? 'No respondió';
}

/** Lo que dice la fila con la lista cerrada: qué dijo y cuándo llegó. */
export function textoEnLaListaCerrada(p: PersonaDeLaLista, zona: string | null): string {
  const antes = p.respuesta === 'GOING' ? 'Dijo «Voy»' : 'No confirmó';
  if (p.llegada === null) return p.respuesta === 'NOT_GOING' ? 'Dijo «No voy»' : antes;
  const hora = p.marcadaEn ? ` ${horaEnZona(p.marcadaEn, zona)}` : '';
  return p.llegada === 'TARDE' ? `${antes} · llegó tarde,${hora}` : `${antes} · llegó${hora}`;
}

export interface ResumenDeLista {
  presentes: number;
  aTiempo: number;
  tarde: number;
  dijeronVoy: number;
  /** De los que dijeron «Voy», cuántos vinieron. */
  vinieronDeLosQueDijeronVoy: number;
  /** Vinieron sin haber dicho «Voy». */
  sinConfirmar: number;
  /** Dijeron «Voy» y no vinieron. */
  faltaron: number;
  total: number;
}

export function resumirLista(personas: readonly PersonaDeLaLista[]): ResumenDeLista {
  const presentes = personas.filter(p => p.llegada !== null);
  const dijeronVoy = personas.filter(p => p.respuesta === 'GOING');
  const vinieron = dijeronVoy.filter(p => p.llegada !== null).length;
  return {
    presentes: presentes.length,
    aTiempo: presentes.filter(p => p.llegada === 'A_TIEMPO').length,
    tarde: presentes.filter(p => p.llegada === 'TARDE').length,
    dijeronVoy: dijeronVoy.length,
    vinieronDeLosQueDijeronVoy: vinieron,
    sinConfirmar: presentes.filter(p => p.respuesta !== 'GOING').length,
    faltaron: dijeronVoy.length - vinieron,
    total: personas.length,
  };
}

/** Filtra por nombre sin importar tildes ni mayúsculas. */
export function filtrarPorNombre<T extends { nombre: string }>(personas: readonly T[], texto: string): T[] {
  const buscado = normalizeText(texto.trim());
  if (!buscado) return [...personas];
  return personas.filter(p => normalizeText(p.nombre).includes(buscado));
}

/** En qué momento está la lista, para la etiqueta de la tarjeta y de la pantalla. */
export type MomentoDeLaLista = 'todavia' | 'abierta' | 'cerrada' | 'vencida';

export function momentoDeLaLista(lista: Pick<ListaDeAsistencia, 'abreEn' | 'cierraEn' | 'cerrada'>, ahoraMs: number): MomentoDeLaLista {
  if (lista.cerrada) return 'cerrada';
  if (ahoraMs < Date.parse(lista.abreEn)) return 'todavia';
  if (ahoraMs > Date.parse(lista.cierraEn)) return 'vencida';
  return 'abierta';
}

/** El texto que se comparte con el menú del teléfono (supuesto S-6 de D-256: texto, sin librerías). */
export function textoParaCompartir(
  titulo: string,
  inicio: string,
  zona: string | null,
  lista: ListaDeAsistencia,
): string {
  const r = resumirLista(lista.personas);
  const nombres = (filtro: (p: PersonaDeLaLista) => boolean) =>
    lista.personas.filter(filtro).map(p => `• ${p.nombre}${p.llegada === 'TARDE' ? ' (tarde)' : ''}`);
  const asistieron = nombres(p => p.llegada !== null);
  const faltaron = nombres(p => p.llegada === null && p.respuesta === 'GOING');
  return [
    `${titulo} · ${fechaConMes(inicio, zona)}`,
    `Asistieron ${r.presentes} (${r.aTiempo} a tiempo, ${r.tarde} tarde). ${r.vinieronDeLosQueDijeronVoy} de los ${r.dijeronVoy} que dijeron «Voy».`,
    '',
    `Asistieron (${asistieron.length}):`,
    ...(asistieron.length ? asistieron : ['• Nadie']),
    '',
    `Dijeron «Voy» y faltaron (${faltaron.length}):`,
    ...(faltaron.length ? faltaron : ['• Nadie']),
  ].join('\n');
}

/** El texto de «Quién respondió» para compartir. */
export function respuestasParaCompartir(
  titulo: string,
  inicio: string,
  zona: string | null,
  personas: readonly PersonaQueRespondio[],
): string {
  const g = agruparRespuestas(personas);
  const lista = (ps: readonly PersonaQueRespondio[]) => (ps.length ? ps.map(p => `• ${p.nombre}`) : ['• Nadie']);
  return [
    `${titulo} · ${fechaConMes(inicio, zona)}`,
    '',
    `Van (${g.van.length}):`,
    ...lista(g.van),
    '',
    `No van (${g.noVan.length}):`,
    ...lista(g.noVan),
    '',
    `Sin respuesta (${g.sinRespuesta.length}):`,
    ...lista(g.sinRespuesta),
  ].join('\n');
}
