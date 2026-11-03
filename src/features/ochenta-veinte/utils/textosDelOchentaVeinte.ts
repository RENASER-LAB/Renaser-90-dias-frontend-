import { ETIQUETA_EJE } from '../../objetivos/types/objetivos.types';
import type {
  AccionDelOchentaVeinte,
  CifrasDelEje,
  CifrasDelOchentaVeinte,
  EnergiaDelCodigoRenaser,
  ResumenDeLaSemana,
  TipoDePeriodo,
  VistaDelPeriodo,
} from '../types/ochentaVeinte.types';

/**
 * Los textos de «Tu 80/20» por semana y por mes (spec 031): en tipo oración, tuteo de Perú, sin culpa. Todo puro: la hoja de Plan y la
 * sección de las fichas leen de acá, y las pruebas fijan cada frase. Las cifras llegan calculadas por el servidor; acá solo se dicen.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const TITULO_DE_LA_HOJA = 'Tu 80/20';
export const TITULO_DE_LA_SECCION = 'Tu 80/20';
/** La sección de la ficha la lee quien acompaña sobre OTRA persona: «Su 80/20», no «Tu 80/20» (E2E de las formaciones, J2-8). */
export const TITULO_DE_LA_SECCION_DE_LA_FICHA = 'Su 80/20';

export const PARTES_DEL_ANALISIS = {
  loQueMasMovio: 'Lo que más movió',
  loQueSeTeFue: 'Lo que se te fue',
  comoEstuviste: 'Cómo estuviste',
} as const;

/**
 * Quién lee. El 80/20 de Plan lo lee la propia persona (tuteo: «Tu 80/20», «tus cifras»); el de la ficha lo lee su mentor, su guía, su líder o
 * Administración sobre otra persona, y habla de ella en tercera persona, como el resto de la ficha. Todo lo que cambia entre las dos está en
 * {@link textosDeLaVoz} y en {@link avisoDelEstado}; las cifras y el texto de SER son los mismos.
 */
export type VozDelOchentaVeinte = 'propia' | 'ficha';

export interface TextosDeLaVoz {
  periodoAnterior: string;
  periodoSiguiente: string;
  cargando: string;
  noCargo: string;
  noCargoSinRed: string;
  sinAcciones: string;
  loQueSeFue: string;
  comoEstuvo: string;
  /** `Análisis de SER · 26 de octubre. …` (o sin la fecha si no se lee). */
  pie: (generado: string | null) => string;
}

export function textosDeLaVoz(voz: VozDelOchentaVeinte): TextosDeLaVoz {
  if (voz === 'ficha') {
    return {
      periodoAnterior: 'Su 80/20: periodo anterior',
      periodoSiguiente: 'Su 80/20: periodo siguiente',
      cargando: 'Cargando su 80/20…',
      noCargo: 'No pudimos cargar su 80/20.',
      noCargoSinRed: 'No pudimos cargar su 80/20. Revisa tu conexión.',
      sinAcciones: 'No hay acciones planificadas en este periodo.',
      loQueSeFue: 'Lo que se le fue',
      comoEstuvo: 'Cómo estuvo',
      pie: generado =>
        generado
          ? `Análisis de SER · ${generado}. No cambia su plan: lo que sugiere lo decide la persona.`
          : 'Análisis de SER. No cambia su plan: lo que sugiere lo decide la persona.',
    };
  }
  return {
    periodoAnterior: 'Tu 80/20: periodo anterior',
    periodoSiguiente: 'Tu 80/20: periodo siguiente',
    cargando: 'Cargando tu 80/20…',
    noCargo: 'No pudimos cargar tu 80/20.',
    noCargoSinRed: 'No pudimos cargar tu 80/20. Revisa tu conexión.',
    sinAcciones: TEXTO_SIN_ACCIONES,
    loQueSeFue: PARTES_DEL_ANALISIS.loQueSeTeFue,
    comoEstuvo: PARTES_DEL_ANALISIS.comoEstuviste,
    pie: generado =>
      generado
        ? `Análisis de SER · ${generado}. No cambia tu plan: lo que sugiere lo decides tú.`
        : 'Análisis de SER. No cambia tu plan: lo que sugiere lo decides tú.',
  };
}

/** `Para la próxima semana` / `Para el próximo mes`. */
export function tituloDeLosPasos(tipo: TipoDePeriodo): string {
  return tipo === 'MES' ? 'Para el próximo mes' : 'Para la próxima semana';
}

/** `Semana 10` / `Mes 3`. */
export function tituloDelPeriodo(tipo: TipoDePeriodo, numero: number): string {
  return `${tipo === 'MES' ? 'Mes' : 'Semana'} ${numero}`;
}

/** `Del 12 al 18 de octubre`, o `Del 26 de octubre al 1 de noviembre`. La cadena vacía si las fechas no se leen. */
export function rangoDelPeriodo(inicio: string, fin: string): string {
  const desde = new Date(`${inicio}T00:00:00Z`);
  const hasta = new Date(`${fin}T00:00:00Z`);
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) return '';
  if (desde.getTime() === hasta.getTime()) return `El ${desde.getUTCDate()} de ${MESES[desde.getUTCMonth()]}`;
  const mesDeInicio = desde.getUTCMonth() === hasta.getUTCMonth() ? '' : ` de ${MESES[desde.getUTCMonth()]}`;
  return `Del ${desde.getUTCDate()}${mesDeInicio} al ${hasta.getUTCDate()} de ${MESES[hasta.getUTCMonth()]}`;
}

/** `26 de octubre`, para «generado el …». */
export function fechaCorta(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios;
}

/** `9 de 12 acciones cumplidas · 75 %`; `null` si no hay acciones planificadas (nunca «0 de 0»). */
export function lineaDeAvance(c: Pick<CifrasDelOchentaVeinte, 'planificadas' | 'cumplidas' | 'porcentajeCumplidas'>): string | null {
  if (c.planificadas <= 0) return null;
  const base = `${c.cumplidas} de ${c.planificadas} ${plural(c.planificadas, 'acción cumplida', 'acciones cumplidas')}`;
  return c.porcentajeCumplidas !== null ? `${base} · ${c.porcentajeCumplidas} %` : base;
}

/** Regla de las verdes: `Acciones verdes: 3 de 5 cumplidas · el 55 % del impacto que cumpliste vino de ellas`. */
export function lineaDeLasVerdes(c: Pick<CifrasDelOchentaVeinte, 'verdes'>): string | null {
  const v = c.verdes;
  if (!v || v.planificadas <= 0) return null;
  const base = `Acciones verdes: ${v.cumplidas} de ${v.planificadas} ${plural(v.cumplidas, 'cumplida', 'cumplidas')}`;
  return v.porcentajeDelImpacto !== null ? `${base} · el ${v.porcentajeDelImpacto} % del impacto que cumpliste vino de ellas` : base;
}

/** Regla del 20 %: `El 20 % que más movió: 2 acciones · el 38 % del impacto cumplido`. `null` con pocas cumplidas. */
export function lineaDelVeintePorCiento(c: Pick<CifrasDelOchentaVeinte, 'veintePorCiento'>): string | null {
  const v = c.veintePorCiento;
  if (!v || v.acciones <= 0) return null;
  const base = `El 20 % que más movió: ${v.acciones} ${plural(v.acciones, 'acción', 'acciones')}`;
  return v.porcentajeDelImpacto !== null ? `${base} · el ${v.porcentajeDelImpacto} % del impacto cumplido` : base;
}

export function nombreDelEje(eje: string): string {
  return (ETIQUETA_EJE as Record<string, string | undefined>)[eje] ?? 'Otro eje';
}

/** `Cuerpo · 3 de 4 · 49 % del impacto`. */
export function lineaDeUnEje(e: CifrasDelEje): string {
  const base = `${nombreDelEje(e.eje)} · ${e.cumplidas} de ${e.planificadas}`;
  return e.porcentajeDelImpacto !== null ? `${base} · ${e.porcentajeDelImpacto} % del impacto` : base;
}

/** `Entrenar · Cuerpo`. */
export function lineaDeUnaAccion(a: AccionDelOchentaVeinte): string {
  return `${a.titulo} · ${nombreDelEje(a.eje)}`;
}

/** `Semana 9 · 8 de 10 · 80 %`. */
export function lineaDeUnaSemana(s: ResumenDeLaSemana): string {
  const base = s.planificadas > 0 ? `Semana ${s.numero} · ${s.cumplidas} de ${s.planificadas}` : `Semana ${s.numero} · sin acciones`;
  return s.porcentajeCumplidas !== null ? `${base} · ${s.porcentajeCumplidas} %` : base;
}

/** `Código Renaser: 12 respuestas · energía promedio 6.4`. */
export function lineaDelCodigoRenaser(e: EnergiaDelCodigoRenaser): string {
  const base = `Código Renaser: ${e.respuestas} ${plural(e.respuestas, 'respuesta', 'respuestas')}`;
  return e.energiaPromedio !== null ? `${base} · energía promedio ${e.energiaPromedio}` : base;
}

/** Lo que dice la hoja cuando no hay acciones que contar: cómo planificar, sin culpa (US1.4). */
export const TEXTO_SIN_ACCIONES = 'Todavía no planificaste acciones en este periodo. Agéndalas y aquí verás cuáles mueven más tu avance.';
export const TEXTO_PARA_AGENDAR = 'Agendar mis acciones';

/** Lo que cada estado dice debajo de las cifras. `null` = el análisis se muestra (LISTO) y no hace falta una línea aparte. */
export function avisoDelEstado(
  vista: Pick<VistaDelPeriodo, 'estado' | 'tipo' | 'falta' | 'minimoDeAcciones'>,
  voz: VozDelOchentaVeinte = 'propia',
): string | null {
  const propia = voz === 'propia';
  const periodoDe = vista.tipo === 'MES' ? 'mes' : 'semana';
  const de = `${propia ? 'tu' : 'su'} ${periodoDe}`;
  switch (vista.estado) {
    case 'EN_CURSO':
      return propia
        ? `Estas son tus cifras al día. Tu análisis llega cuando cierre ${vista.tipo === 'MES' ? 'el mes' : 'la semana'}.`
        : `Estas son sus cifras al día. Su análisis llega cuando cierre ${vista.tipo === 'MES' ? 'el mes' : 'la semana'}.`;
    case 'PENDIENTE':
      return propia ? 'Tu análisis estará listo en cuanto podamos generarlo.' : 'Su análisis estará listo en cuanto podamos generarlo.';
    case 'SIN_DATOS':
      return `Todavía no hay suficiente para analizar ${de}. ${loQueFalta(vista, voz)}`;
    case 'SIN_ANALISIS':
      return propia
        ? `No pudimos generar el análisis de ${de}. Tus cifras de arriba siguen siendo las tuyas.`
        : `No pudimos generar el análisis de ${de}. Las cifras de arriba siguen siendo las suyas.`;
    default:
      return null;
  }
}

function loQueFalta(vista: Pick<VistaDelPeriodo, 'tipo' | 'falta' | 'minimoDeAcciones'>, voz: VozDelOchentaVeinte): string {
  const sinAcciones = vista.falta.includes('ACCIONES');
  const sinDias = vista.falta.includes('DIAS');
  const periodo = vista.tipo === 'MES' ? 'el mes' : 'la semana';
  if (sinAcciones && vista.minimoDeAcciones > 0) {
    return `Con al menos ${vista.minimoDeAcciones} acciones planificadas${sinDias ? ', repartidas en varios días,' : ''} analizamos ${periodo}.`;
  }
  if (voz === 'ficha') {
    if (sinDias) return `Con las acciones repartidas en más días analizamos ${periodo}.`;
    return 'Cuando planifique más acciones, su análisis llegará solo.';
  }
  if (sinDias) return `Reparte tus acciones en más días y analizamos ${periodo}.`;
  return 'Cuando planifiques más acciones, tu análisis llegará solo.';
}

/** Lo que oye el lector de pantalla de una cifra suelta: la misma frase, sin el punto medio. */
export function paraLeer(frase: string): string {
  return frase.replace(/ · /g, '. ');
}

/** ¿Hay algo de cifras que mostrar? Un periodo sin acciones no muestra un tablero de ceros. */
export function hayCifras(c: Pick<CifrasDelOchentaVeinte, 'planificadas'>): boolean {
  return c.planificadas > 0;
}
