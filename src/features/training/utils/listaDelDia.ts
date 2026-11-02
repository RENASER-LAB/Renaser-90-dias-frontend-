/**
 * La lista de HOY de Training, ordenada por la hora que la persona planificó (spec 014, «Training por hora»).
 *
 * Lógica pura, sin React ni red: la prueban `__tests__/listaDelDia.test.ts` y la dibuja `ListaDeHoy`. Las reglas son
 * las del dueño (2026-10-29), tal cual:
 *
 * - **Lo que haces desaparece y sube lo que sigue.** Lo hecho sale de la lista a «N hechos hoy», plegado al final.
 * - **El primero** dice «Te toca ahora» si su hora ya llegó, o «Lo que sigue» si todavía no.
 * - **Lo que se te pasa va al final.** «Me toca 5:30, sigue hasta las 6; si no lo hice, sube el de las 6 y se va al
 *   último el que no se cumplió, para igual subir evidencia.» Un pendiente queda ATRASADO cuando llega la hora del
 *   siguiente ítem con hora del día. Sigue registrándose hoy (con menos puntos, D-259).
 * - **Sin hora** va antes de lo atrasado.
 * - **Los eventos que ya terminaron salen**; un evento nunca queda «atrasado» (no se registra).
 * - **Un hábito pausado no aparece hoy.**
 * - **«Cierra tu día» ya no está en esta lista** (spec 033, 2026-10-31): se movió a Plan.
 *
 * Trabaja con minutos desde la medianoche del día de la persona; quien llama decide de dónde sale «ahora».
 */

export type TipoDeItem = 'habito' | 'accion' | 'evento';

/** Lo mínimo que la lista necesita saber de cada ítem; `ItemDelDia` lo extiende con lo que se dibuja. */
export interface ItemBase {
  /** Identifica el ítem entre renders (el id del registro de hoy, el del evento…). */
  clave: string;
  tipo: TipoDeItem;
  /** `HH:mm`, o `null` si no tiene hora. */
  hora: string | null;
  hecho: boolean;
  /** Hábito pausado (solo hoy o hasta reactivarlo): no se muestra. */
  pausado?: boolean;
  /** El día de ese registro ya cerró (`EXPIRADO`, `FALLIDO`): ya no se puede registrar. */
  cerrado?: boolean;
  /** Solo eventos: cuánto dura. Sin dato se asume {@link DURACION_SUPUESTA_DEL_EVENTO_MIN}. */
  duracionMin?: number | null;
}

/**
 * Cuánto se supone que dura un evento que no dice su duración. Es la misma hora de gracia con la que la sección
 * Eventos pide «los próximos» (`listarProximos`: «un evento que empezó hace un rato sigue siendo al que me uno»).
 */
export const DURACION_SUPUESTA_DEL_EVENTO_MIN = 60;

export type MarcaDelPrimero = 'ahora' | 'sigue';

export interface ListaDelDia<T extends ItemBase> {
  /** Lo pendiente con hora y a tiempo, por hora. El primero lleva {@link marcaDelPrimero}. «Cierra tu día» no está acá. */
  enCurso: T[];
  /** El ítem que lleva la marca de «Te toca ahora» / «Lo que sigue»: el primero de `enCurso`. */
  primero: T | null;
  /** `null` si no hay nada en curso. */
  marcaDelPrimero: MarcaDelPrimero | null;
  sinHora: T[];
  /** Pendientes a los que ya les llegó la hora del siguiente: «Se te pasó la hora». */
  atrasados: T[];
  /** Registros cuyo día ya cerró: no se pueden registrar, pero tampoco se esconden. */
  cerrados: T[];
  /** Lo hecho, por hora. Plegado al final. */
  hechos: T[];
}

/** `HH:mm` (o `HH:mm:ss`) → minutos desde medianoche; `null` si no se entiende. */
export function minutosDeLaHora(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hora);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 23 || min > 59 ? null : h * 60 + min;
}

/** Minutos desde la medianoche de un instante, en la hora local del teléfono. */
export function minutosDeAhora(ahoraMs: number): number {
  const d = new Date(ahoraMs);
  return d.getHours() * 60 + d.getMinutes();
}

/** Orden estable por hora; lo que no tiene hora, al final y en su orden de llegada. */
function porHora<T extends ItemBase>(items: T[]): T[] {
  return items
    .map((item, i) => ({ item, i, min: minutosDeLaHora(item.hora) }))
    .sort((a, b) => (a.min ?? Infinity) - (b.min ?? Infinity) || a.i - b.i)
    .map(x => x.item);
}

/** `true` si el evento ya terminó a esa hora. Solo los eventos terminan: un hábito o una acción siguen pendientes. */
export function eventoTerminado(item: ItemBase, ahoraMin: number): boolean {
  if (item.tipo !== 'evento') return false;
  const inicio = minutosDeLaHora(item.hora);
  if (inicio == null) return false;
  return inicio + (item.duracionMin ?? DURACION_SUPUESTA_DEL_EVENTO_MIN) <= ahoraMin;
}

/**
 * Reparte los ítems de hoy en sus secciones.
 *
 * `retenidos` son las claves que se acaban de cumplir y todavía se dejan ver en su lugar (para que el check se
 * llene y suba el «+N» antes de irse): cuentan como pendientes SOLO para repartir, así que no saltan de sección
 * mientras se despiden. El resto de la pantalla (resumen, plegado) los cuenta como hechos.
 */
export function armarListaDelDia<T extends ItemBase>(
  items: T[],
  ahoraMin: number,
  retenidos: ReadonlySet<string> = new Set(),
): ListaDelDia<T> {
  const visibles = items.filter(x => !x.pausado);
  // La hora del «siguiente» sale de TODO lo del día con hora (también lo hecho y los eventos): es lo que viene
  // en la agenda, no solo lo pendiente.
  const horas = visibles
    .map(x => minutosDeLaHora(x.hora))
    .filter((m): m is number => m != null);
  const siguienteHora = (min: number): number | null => {
    const mayores = horas.filter(h => h > min);
    return mayores.length ? Math.min(...mayores) : null;
  };

  const enCurso: T[] = [];
  const sinHora: T[] = [];
  const atrasados: T[] = [];
  const cerrados: T[] = [];
  const hechos: T[] = [];

  for (const item of visibles) {
    if (eventoTerminado(item, ahoraMin)) continue;
    const seDespide = retenidos.has(item.clave);
    if (item.hecho && !seDespide) {
      hechos.push(item);
      continue;
    }
    if (item.cerrado && !item.hecho) {
      cerrados.push(item);
      continue;
    }
    const min = minutosDeLaHora(item.hora);
    if (min == null) {
      sinHora.push(item);
      continue;
    }
    const siguiente = siguienteHora(min);
    if (item.tipo !== 'evento' && siguiente != null && siguiente <= ahoraMin) atrasados.push(item);
    else enCurso.push(item);
  }

  const ordenadoEnCurso = porHora(enCurso);
  const primero = ordenadoEnCurso[0];
  const minPrimero = primero ? minutosDeLaHora(primero.hora) : null;
  return {
    enCurso: ordenadoEnCurso,
    primero: primero ?? null,
    marcaDelPrimero: primero ? (minPrimero != null && minPrimero <= ahoraMin ? 'ahora' : 'sigue') : null,
    sinHora,
    atrasados: porHora(atrasados),
    cerrados: porHora(cerrados),
    hechos: porHora(hechos),
  };
}

/** Los textos de la marca del primero. */
export const TEXTO_DE_LA_MARCA: Record<MarcaDelPrimero, string> = {
  ahora: 'Te toca ahora',
  sigue: 'Lo que sigue',
};

/**
 * Hábitos y acciones del día (los eventos no se «hacen»): cuántos hay y cuántos van,
 * contando los que se despiden.
 */
export function contarElDia(items: ItemBase[]): { hechos: number; total: number } {
  const propios = items.filter(x => !x.pausado && x.tipo !== 'evento');
  return { hechos: propios.filter(x => x.hecho).length, total: propios.length };
}

/** «4 de 12 hechos · 46 pts». Con nada planificado, una frase en vez de «0 de 0». */
export function textoDelResumenDeHoy(hechos: number, total: number, puntos: number): string {
  if (total === 0) return 'Hoy no tienes nada planificado.';
  return `${hechos} de ${total} ${total === 1 ? 'hecho' : 'hechos'} · ${puntos} pts`;
}

/** La etiqueta del plegado al final: «1 hecho hoy», «4 hechos hoy». */
export function etiquetaDeLosHechos(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'hecho' : 'hechos'} hoy`;
}
