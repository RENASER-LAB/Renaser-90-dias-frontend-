import { DIAS_ISO, type DiaIso } from '../../habits/notificaciones/utils/alarmasPorDia';
import {
  codigoDeLaCombinacion,
  COMBINACION_POR_DEFECTO,
  combinacionGuardada,
  mismaCombinacion,
  reglaIncumplida,
  type CombinacionDeAlarma,
} from '../../habits/notificaciones/utils/combinacionDeAlarma';
import { avisoOrdenado, mismoAviso } from '../../training/utils/avisoDeLosDias';

/**
 * Las preferencias de los recordatorios de las acciones de los objetivos, por día de la semana (spec 010).
 * Pura: no toca el almacenamiento ni la librería de avisos (eso es `recordatoriosDeAcciones.ts`).
 *
 * ## El mismo modelo que los hábitos (008 y 009)
 *
 * Una configuración GENERAL y, por cada día de la semana, solo lo que ese día tiene distinto. Cada campo se hereda de
 * forma independiente: un sábado con solo la hora propia sigue la general en el aviso y en cómo suena.
 *
 * | Campo | General | Día |
 * |---|---|---|
 * | `diarioActivo` | «Recordarme mis acciones del día» encendido o apagado | encendido o apagado solo ese día |
 * | `horaDiaria` | `HH:mm` del recordatorio diario | hora propia de ese día |
 * | `antelaciones` | minutos antes de cada acción con hora (`[]` = sin aviso) | las de ese día (`[]` = sin aviso ese día) |
 * | `alarma` | «cómo suena»: sonido, vibración, voz y repetir | la propia de ese día, entera |
 *
 * ## El formato guardado es el de siempre, más dos campos opcionales
 *
 * Lo que había antes de la spec 010 eran tres campos (`diarioActivo`, `horaDiaria`, `antelaciones`): ahora SON la
 * configuración general, tal cual. `alarma` y `dias` solo aparecen cuando la persona los usa, así que quien actualiza
 * la app y no toca nada sigue con exactamente lo que tenía (SC-003): no hay migración que correr.
 *
 * ## «Igual a la general» no se guarda como propio
 *
 * Igual que en el servidor de los hábitos: un día cuyo valor coincide con el de la general vuelve a seguirla. Así un
 * cambio de la general le llega, y «como los demás días» no depende de que alguien lo pida (`dejarComoLosDemas`).
 *
 * ## Los días
 *
 * ISO, como el resto de las alarmas por día: 1 = lunes … 7 = domingo.
 */

export interface DiaPropioDeAcciones {
  /** El recordatorio diario encendido o apagado SOLO ese día. Ausente = el de la general. */
  diarioActivo?: boolean;
  /** `HH:mm` propia del recordatorio diario de ese día. Ausente = la general. */
  horaDiaria?: string;
  /** Antelaciones propias de ese día, en minutos. `[]` = ese día sin aviso. Ausente = las de la general. */
  antelaciones?: number[];
  /** Cómo suenan las alarmas de ese día. Ausente = la general. */
  alarma?: CombinacionDeAlarma;
}

export type DiasPropiosDeAcciones = Partial<Record<DiaIso, DiaPropioDeAcciones>>;

export interface PreferenciasDeAcciones {
  /** El recordatorio diario «Recordarme mis acciones del día» (general). */
  diarioActivo: boolean;
  /** `HH:mm` del recordatorio diario, en la hora del teléfono (general). */
  horaDiaria: string;
  /** Minutos antes de cada acción con hora. Vacío = sin aviso; `0` = a la hora (general). */
  antelaciones: number[];
  /** Cómo suenan las alarmas en general. Ausente = la de siempre (sonido y vibración). */
  alarma?: CombinacionDeAlarma;
  /** Lo propio de cada día. Ausente = ningún día tiene nada propio. */
  dias?: DiasPropiosDeAcciones;
}

/**
 * Apagado y sin aviso: nadie recibe una alarma que no pidió. Las 08:00 son solo la hora con la que ABRE el selector la
 * primera vez (no hay regla del programa sobre esto; es un valor de arranque).
 */
export const PREFERENCIAS_DE_ACCIONES_POR_DEFECTO: PreferenciasDeAcciones = {
  diarioActivo: false,
  horaDiaria: '08:00',
  antelaciones: [],
};

export const esHora = (x: unknown): x is string => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);

const esAntelacion = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

/** Sin repetir y sin lo inválido, en el orden en que llegaron. */
function antelacionesLimpias(x: unknown): number[] | null {
  return Array.isArray(x) ? [...new Set(x.filter(esAntelacion))] : null;
}

/** Una combinación guardada que se puede usar: la que dejaría la alarma muda, o la voz sin sonido, no se acepta. */
function combinacionUsable(x: unknown): CombinacionDeAlarma | null {
  const c = combinacionGuardada(x);
  return c && reglaIncumplida(c) === null ? c : null;
}

function leerDiaPropio(crudo: unknown): DiaPropioDeAcciones | null {
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return null;
  const d = crudo as Record<string, unknown>;
  const dia: DiaPropioDeAcciones = {};
  if (typeof d.diarioActivo === 'boolean') dia.diarioActivo = d.diarioActivo;
  if (esHora(d.horaDiaria)) dia.horaDiaria = d.horaDiaria;
  const antelaciones = antelacionesLimpias(d.antelaciones);
  if (antelaciones) dia.antelaciones = antelaciones;
  const alarma = combinacionUsable(d.alarma);
  if (alarma) dia.alarma = alarma;
  return Object.keys(dia).length > 0 ? dia : null;
}

/** Lee lo guardado. Cualquier cosa rara cae al valor por defecto, campo por campo. */
export function leerPreferenciasDeAcciones(crudo: string | null): PreferenciasDeAcciones {
  const d = PREFERENCIAS_DE_ACCIONES_POR_DEFECTO;
  if (!crudo) return d;
  try {
    const leido = JSON.parse(crudo) as Record<string, unknown> | null;
    if (!leido || typeof leido !== 'object' || Array.isArray(leido)) return d;
    const prefs: PreferenciasDeAcciones = {
      diarioActivo: typeof leido.diarioActivo === 'boolean' ? leido.diarioActivo : d.diarioActivo,
      horaDiaria: esHora(leido.horaDiaria) ? leido.horaDiaria : d.horaDiaria,
      antelaciones: antelacionesLimpias(leido.antelaciones) ?? d.antelaciones,
    };
    const alarma = combinacionUsable(leido.alarma);
    if (alarma && !mismaCombinacion(alarma, COMBINACION_POR_DEFECTO)) prefs.alarma = alarma;
    const dias = leerDias(leido.dias);
    if (dias) prefs.dias = dias;
    return prefs;
  } catch {
    return d;
  }
}

function leerDias(crudo: unknown): DiasPropiosDeAcciones | null {
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return null;
  const dias: DiasPropiosDeAcciones = {};
  for (const iso of DIAS_ISO) {
    const dia = leerDiaPropio((crudo as Record<string, unknown>)[String(iso)]);
    if (dia) dias[iso] = dia;
  }
  return Object.keys(dias).length > 0 ? dias : null;
}

/* ------------------------------------------------------------------------------------------------
 * Resolver
 * ---------------------------------------------------------------------------------------------- */

/** Lo que rige un día, ya resuelto, y qué de eso es propio de ese día. */
export interface AjustesDelDia {
  iso: DiaIso;
  diarioActivo: boolean;
  horaDiaria: string;
  antelaciones: number[];
  alarma: CombinacionDeAlarma;
  propio: { diarioActivo: boolean; horaDiaria: boolean; antelaciones: boolean; alarma: boolean };
}

/** La combinación general: la guardada o la de siempre. */
export function alarmaGeneral(prefs: PreferenciasDeAcciones): CombinacionDeAlarma {
  return prefs.alarma ?? { ...COMBINACION_POR_DEFECTO };
}

export function resolverDia(prefs: PreferenciasDeAcciones, iso: DiaIso): AjustesDelDia {
  const propio = prefs.dias?.[iso];
  return {
    iso,
    diarioActivo: propio?.diarioActivo ?? prefs.diarioActivo,
    horaDiaria: propio?.horaDiaria ?? prefs.horaDiaria,
    antelaciones: [...(propio?.antelaciones ?? prefs.antelaciones)],
    alarma: { ...(propio?.alarma ?? alarmaGeneral(prefs)) },
    propio: {
      diarioActivo: propio?.diarioActivo !== undefined,
      horaDiaria: propio?.horaDiaria !== undefined,
      antelaciones: propio?.antelaciones !== undefined,
      alarma: propio?.alarma !== undefined,
    },
  };
}

export function resolverLaSemana(prefs: PreferenciasDeAcciones): AjustesDelDia[] {
  return DIAS_ISO.map(iso => resolverDia(prefs, iso));
}

/**
 * El día de la semana (ISO) de una fecha `YYYY-MM-DD`. Se calcula de la fecha misma y no del reloj del teléfono: el
 * aviso de una acción del sábado es el del sábado aunque se lea el martes. `null` si no es una fecha.
 */
export function diaIsoDeFecha(fecha: string): DiaIso | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) return null;
  const dia = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(dia.getTime())) return null;
  return (((dia.getUTCDay() + 6) % 7) + 1) as DiaIso;
}

/** Las antelaciones que rigen las acciones de esa fecha: las de su día de la semana. Sin fecha válida, las generales. */
export function antelacionesDeLaFecha(prefs: PreferenciasDeAcciones, fecha: string): number[] {
  const iso = diaIsoDeFecha(fecha);
  return iso ? resolverDia(prefs, iso).antelaciones : [...prefs.antelaciones];
}

/* ------------------------------------------------------------------------------------------------
 * Cambiar
 * ---------------------------------------------------------------------------------------------- */

/** Lo que la persona tocó. Solo se guarda lo que viene: lo demás de cada día se queda como estaba. */
export interface CambioDeAcciones {
  diarioActivo?: boolean;
  horaDiaria?: string;
  antelaciones?: readonly number[];
  /** Los interruptores tocados de «Cómo suena»: se suman a lo que cada día ya tenía. */
  alarma?: Partial<CombinacionDeAlarma>;
}

function sinVacios(prefs: PreferenciasDeAcciones): PreferenciasDeAcciones {
  const { dias, alarma, ...resto } = prefs;
  const limpio: PreferenciasDeAcciones = { ...resto };
  if (alarma && !mismaCombinacion(alarma, COMBINACION_POR_DEFECTO)) limpio.alarma = alarma;
  if (dias) {
    const conAlgo = Object.fromEntries(Object.entries(dias).filter(([, d]) => d && Object.keys(d).length > 0));
    if (Object.keys(conAlgo).length > 0) limpio.dias = conAlgo as DiasPropiosDeAcciones;
  }
  return limpio;
}

/**
 * Aplica lo tocado. Sin `dias`, a la general (lo propio de cada día no se mueve). Con `dias`, a cada uno de ellos: lo
 * que queda igual a la general vuelve a seguirla. No cambia `prefs`.
 */
export function conCambios(
  prefs: PreferenciasDeAcciones,
  dias: readonly DiaIso[],
  cambio: CambioDeAcciones,
): PreferenciasDeAcciones {
  if (dias.length === 0) {
    const siguiente: PreferenciasDeAcciones = { ...prefs };
    if (cambio.diarioActivo !== undefined) siguiente.diarioActivo = cambio.diarioActivo;
    if (cambio.horaDiaria !== undefined) siguiente.horaDiaria = cambio.horaDiaria;
    if (cambio.antelaciones !== undefined) siguiente.antelaciones = avisoOrdenado(cambio.antelaciones);
    if (cambio.alarma) siguiente.alarma = { ...alarmaGeneral(prefs), ...cambio.alarma };
    return sinVacios(siguiente);
  }
  const general = {
    diarioActivo: prefs.diarioActivo,
    horaDiaria: prefs.horaDiaria,
    antelaciones: prefs.antelaciones,
    alarma: alarmaGeneral(prefs),
  };
  const nuevosDias: DiasPropiosDeAcciones = { ...(prefs.dias ?? {}) };
  for (const iso of dias) {
    const dia: DiaPropioDeAcciones = { ...(nuevosDias[iso] ?? {}) };
    if (cambio.diarioActivo !== undefined) {
      if (cambio.diarioActivo === general.diarioActivo) delete dia.diarioActivo;
      else dia.diarioActivo = cambio.diarioActivo;
    }
    if (cambio.horaDiaria !== undefined) {
      if (cambio.horaDiaria === general.horaDiaria) delete dia.horaDiaria;
      else dia.horaDiaria = cambio.horaDiaria;
    }
    if (cambio.antelaciones !== undefined) {
      if (mismoAviso(cambio.antelaciones, general.antelaciones)) delete dia.antelaciones;
      else dia.antelaciones = avisoOrdenado(cambio.antelaciones);
    }
    if (cambio.alarma) {
      const nueva = { ...resolverDia(prefs, iso).alarma, ...cambio.alarma };
      if (mismaCombinacion(nueva, general.alarma)) delete dia.alarma;
      else dia.alarma = nueva;
    }
    nuevosDias[iso] = dia;
  }
  return sinVacios({ ...prefs, dias: nuevosDias });
}

/** Esos días vuelven a seguir a la general en todo: hora, encendido, aviso y cómo suena. */
export function dejarComoLosDemas(prefs: PreferenciasDeAcciones, dias: readonly DiaIso[]): PreferenciasDeAcciones {
  const nuevosDias: DiasPropiosDeAcciones = { ...(prefs.dias ?? {}) };
  for (const iso of dias) delete nuevosDias[iso];
  return sinVacios({ ...prefs, dias: nuevosDias });
}

/* ------------------------------------------------------------------------------------------------
 * Qué piden las alarmas
 * ---------------------------------------------------------------------------------------------- */

/** Lo que de verdad suena en el recordatorio diario de un día: nada si está apagado; si no, su hora y cómo suena. */
function efectoDelDiario(d: Pick<AjustesDelDia, 'diarioActivo' | 'horaDiaria' | 'alarma'>): string {
  if (!d.diarioActivo) return 'apagado';
  const a = d.alarma;
  return `${d.horaDiaria}|${[a.sonido, a.vibracion, a.voz, a.repetir].map(x => (x ? 1 : 0)).join('')}`;
}

/**
 * ¿Algún día tiene un recordatorio diario distinto del general (encendido, hora o cómo suena)? Con todos iguales, el
 * diario sigue siendo UNA alarma diaria, como siempre; con alguno distinto, una por día. Un día cuyo recordatorio está
 * apagado (en general y en él) no cuenta aunque tenga hora propia: no suena.
 */
export function hayDiasDistintosEnElDiario(prefs: PreferenciasDeAcciones): boolean {
  const general = efectoDelDiario({
    diarioActivo: prefs.diarioActivo,
    horaDiaria: prefs.horaDiaria,
    alarma: alarmaGeneral(prefs),
  });
  return resolverLaSemana(prefs).some(d => efectoDelDiario(d) !== general);
}

/** ¿Algún día tiene el recordatorio diario encendido? */
export function hayDiarioEnAlgunDia(prefs: PreferenciasDeAcciones): boolean {
  return resolverLaSemana(prefs).some(d => d.diarioActivo);
}

/** ¿Algún día avisa antes de sus acciones con hora? */
export function hayAvisoEnAlgunDia(prefs: PreferenciasDeAcciones): boolean {
  return resolverLaSemana(prefs).some(d => d.antelaciones.length > 0);
}

/* ------------------------------------------------------------------------------------------------
 * Comparar
 * ---------------------------------------------------------------------------------------------- */

/**
 * Una firma de lo que rige cada día, sin depender del orden de las claves ni de cómo se escribieron las antelaciones.
 * Dos preferencias con la misma firma hacen sonar lo mismo; la pantalla la usa para saber si guardar cambiaría algo.
 */
export function huellaDeLasPreferencias(prefs: PreferenciasDeAcciones): string {
  return JSON.stringify([
    prefs.diarioActivo,
    prefs.horaDiaria,
    avisoOrdenado(prefs.antelaciones),
    codigoDeLaCombinacion(alarmaGeneral(prefs)),
    resolverLaSemana(prefs).map(d => [
      d.diarioActivo,
      d.horaDiaria,
      avisoOrdenado(d.antelaciones),
      codigoDeLaCombinacion(d.alarma),
      d.propio.diarioActivo,
      d.propio.horaDiaria,
      d.propio.antelaciones,
      d.propio.alarma,
    ]),
  ]);
}

/**
 * Una firma de las alarmas de AVISO de cada acción: las antelaciones y cómo suena de cada día. Si no cambió, las alarmas
 * de las acciones ya puestas siguen valiendo y no hay que rehacerlas.
 */
export function huellaDeLosAvisos(prefs: PreferenciasDeAcciones): string {
  return JSON.stringify(
    resolverLaSemana(prefs).map(d => [avisoOrdenado(d.antelaciones), codigoDeLaCombinacion(d.alarma)]),
  );
}
