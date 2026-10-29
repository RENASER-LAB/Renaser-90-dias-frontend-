/**
 * Mi Radar (spec 012): las decisiones puras, sin pantalla ni red.
 *
 * Qué horas se pueden elegir y si lo elegido vale, qué horas avisan en cada día del programa, qué patrones salen de
 * los registros y cómo se dice todo eso. Lo que se prueba acá es la regla; las pantallas solo la dibujan.
 *
 * **Las reglas de las horas se validan dos veces, a propósito** (pedido del dueño: «la validación tanto backend y
 * frontend»): la app antes de guardar, para que la persona vea el motivo sin esperar, y el servidor después, que es
 * el que decide. Los números salen de `MI_RADAR`.
 *
 * ## Por día de la semana (cuarta ronda, 2026-10-29: «no harán la acción todos los días… igual que los hábitos»)
 *
 * Mi Radar tiene horas para todos los días (`horas`) y, por día de la semana, horas propias o «Sin Radar ese día»
 * (`dias`). **`horasDelDia(config, diaIso)` es la única que dice qué horas tiene un día**: «Hoy», el registrar, los
 * avisos del teléfono y el texto de la fila la usan, y ninguna otra mira `dias` por su cuenta. Lo de editar días
 * marcados (borrador, qué se guarda) vive en `diasDeMiRadar.ts`.
 */
import { CONFIG_RADAR, MI_RADAR } from '../config/configRadar';
import type { DiaDeMiRadarApi, MiRadarApi, RegistroRadarApi } from '../types/radar.types';
import { horaEnPunto, horasConSlot } from './slotsDelRadar';

/** ¿Desde este día del programa se puede tener Mi Radar? Con el Código Renaser apagado del todo, no. */
export function miRadarCorresponde(diaPrograma: number | null | undefined): boolean {
  return CONFIG_RADAR.activo && diaPrograma != null && diaPrograma >= MI_RADAR.primerDia;
}

/** Las horas en punto que se pueden elegir, en orden: de 03:00 a 23:00. */
export function horasElegibles(): number[] {
  return Array.from({ length: MI_RADAR.ultimaHora - MI_RADAR.primeraHora + 1 }, (_, i) => MI_RADAR.primeraHora + i);
}

export const MENSAJE_SIN_HORAS = 'Elige al menos una hora';
export const MENSAJE_DEMASIADAS_HORAS = `Puedes elegir hasta ${MI_RADAR.maximoDeHoras}`;

/**
 * ¿Valen estas horas? De 1 a 12, en punto, entre 03:00 y 23:00 y sin repetir. Si valen, las devuelve ordenadas.
 * Es lo mismo que exige el servidor (`MiRadar`): la app no deja elegir lo que él rechazaría.
 */
export function validarHoras(horas: readonly number[]): { ok: true; horas: number[] } | { ok: false; error: string } {
  if (horas.length === 0) return { ok: false, error: MENSAJE_SIN_HORAS };
  if (horas.length > MI_RADAR.maximoDeHoras) return { ok: false, error: MENSAJE_DEMASIADAS_HORAS };
  const fueraDeRango = horas.some(h => !Number.isInteger(h) || h < MI_RADAR.primeraHora || h > MI_RADAR.ultimaHora);
  if (fueraDeRango) {
    return { ok: false, error: `Las horas van de ${horaEnPunto(MI_RADAR.primeraHora)} a ${horaEnPunto(MI_RADAR.ultimaHora)}` };
  }
  if (new Set(horas).size !== horas.length) return { ok: false, error: 'Hay una hora repetida' };
  return { ok: true, horas: [...horas].sort((a, b) => a - b) };
}

/**
 * Marca o desmarca una hora en lo que se está eligiendo. Si ya hay 12 y se marca otra no cambia nada: la pantalla
 * lo dice con `MENSAJE_DEMASIADAS_HORAS`.
 */
export function alternarHora(elegidas: readonly number[], hora: number): number[] {
  if (elegidas.includes(hora)) return elegidas.filter(h => h !== hora);
  if (elegidas.length >= MI_RADAR.maximoDeHoras) return [...elegidas];
  return [...elegidas, hora].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------------------------------------------
// Las horas de cada día de la semana
// ---------------------------------------------------------------------------------------------------------------

/** Los siete días como los numera el contrato: ISO, lunes = 1 … domingo = 7. */
export const DIAS_ISO = [1, 2, 3, 4, 5, 6, 7] as const;
export type DiaIso = (typeof DIAS_ISO)[number];

/** Cómo se llama cada día en una línea corta (`sáb`), en el orden de `DIAS_ISO`. */
const NOMBRE_CORTO_DEL_DIA: Readonly<Record<DiaIso, string>> = {
  1: 'lun', 2: 'mar', 3: 'mié', 4: 'jue', 5: 'vie', 6: 'sáb', 7: 'dom',
};

/**
 * Las horas que valen: enteras, entre `primeraHora` y `ultimaHora`, sin repetir y en orden. Una hora fuera de eso nunca
 * debe sonar ni mostrarse como elegida, aunque el servidor (que también las valida) alguna vez la mandara.
 */
export function limpiarHoras(horas: readonly number[] | null | undefined): number[] {
  return [...new Set(horas ?? [])]
    .filter(h => Number.isInteger(h) && h >= MI_RADAR.primeraHora && h <= MI_RADAR.ultimaHora)
    .sort((a, b) => a - b);
}

/**
 * Las horas en punto de Mi Radar en un día de la semana (`diaIso`: lunes = 1 … domingo = 7), en orden.
 *
 * - Apagado, o sin saberlo (`null`): ninguna.
 * - Un día con horas propias en `dias` usa **esas**; con `horas: []` es «Sin Radar ese día» y no tiene ninguna.
 * - Un día que no está en `dias` sigue las de todos los días (`horas`).
 * - Un backend anterior no manda `dias`: ningún día tiene horas propias.
 *
 * Es la única regla de «qué horas tiene este día»: «Hoy», «Registrar ahora», los avisos del teléfono y el resumen de la
 * fila la usan y ninguna otra.
 */
export function horasDelDia(config: MiRadarApi | null | undefined, diaIso: number): number[] {
  if (!config?.encendido) return [];
  const propio = config.dias?.find(d => d.dia === diaIso);
  return limpiarHoras(propio ? propio.horas : config.horas);
}

/** ¿Ese día va «Sin Radar»? Solo si tiene su propia entrada con `horas: []`: un día que sigue a todos nunca lo es. */
export function diaSinRadar(config: MiRadarApi | null | undefined, diaIso: number): boolean {
  if (!config?.encendido) return false;
  const propio = config.dias?.find(d => d.dia === diaIso);
  return propio !== undefined && limpiarHoras(propio.horas).length === 0;
}

const mismasHoras = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((h, i) => h === b[i]);

/**
 * Los días cuyas horas son distintas de las de todos los días, en orden de día: lo que de verdad cambia algo. Una
 * entrada en `dias` con las mismas horas que `horas` no cuenta (ese día suena igual que los demás).
 */
export function diasConHorasPropias(config: MiRadarApi | null | undefined): Array<{ dia: DiaIso; horas: number[] }> {
  if (!config?.encendido) return [];
  const generales = limpiarHoras(config.horas);
  return DIAS_ISO.map(dia => ({ dia, horas: horasDelDia(config, dia) })).filter(d => !mismasHoras(d.horas, generales));
}

/** ¿Algún día suena distinto de los demás (con otras horas o sin Radar)? De esto depende cómo se programan los avisos. */
export function hayDiasPropios(config: MiRadarApi | null | undefined): boolean {
  return diasConHorasPropias(config).length > 0;
}

/**
 * Una huella de lo guardado, para saber si «volver a leer» trajo algo distinto: encendido, horas y días con horas propias.
 * Leer lo mismo (al abrir Mi Radar) no reprograma los avisos ni reinicia lo que se está editando.
 */
export function claveDeMiRadar(config: MiRadarApi | null | undefined): string {
  if (!config) return '';
  const dias = (config.dias ?? []).map(d => `${d.dia}=${d.horas.join('.')}`).join(';');
  return `${config.encendido ? 1 : 0}:${config.horas.join(',')}:${dias}`;
}

/**
 * ¿Valen estas horas propias de unos días? Cada día entre 1 y 7 una sola vez y, si tiene horas, las mismas reglas de
 * siempre (`validarHoras`); `horas: []` es «Sin Radar ese día» y vale. Si valen, las devuelve ordenadas por día. Es lo que
 * el servidor vuelve a exigir.
 */
export function validarDias(
  dias: readonly DiaDeMiRadarApi[],
): { ok: true; dias: DiaDeMiRadarApi[] } | { ok: false; error: string } {
  const vistos = new Set<number>();
  const revisados: DiaDeMiRadarApi[] = [];
  for (const d of dias) {
    if (!Number.isInteger(d.dia) || d.dia < 1 || d.dia > 7) return { ok: false, error: 'Hay un día que no existe' };
    if (vistos.has(d.dia)) return { ok: false, error: 'Hay un día repetido' };
    vistos.add(d.dia);
    if (d.horas.length === 0) {
      revisados.push({ dia: d.dia, horas: [] });
      continue;
    }
    const horas = validarHoras(d.horas);
    if (!horas.ok) return { ok: false, error: horas.error };
    revisados.push({ dia: d.dia, horas: horas.horas });
  }
  return { ok: true, dias: revisados.sort((a, b) => a.dia - b.dia) };
}

/**
 * Un aviso del teléfono: a esa `hora` en punto, todos los días (`dia: null`, una alarma DIARIA) o solo ese día de la
 * semana (`dia` ISO, una alarma SEMANAL).
 */
export interface AvisoDeRadar {
  hora: number;
  dia: DiaIso | null;
}

/**
 * Qué avisos suenan en el teléfono ese día del programa.
 *
 * - **Días 1 a 7**: las 12 de siempre, de 08:00 a 19:00, DIARIAS, tenga lo que tenga Mi Radar. Es exactamente lo que
 *   había antes de la spec 012 (FR-001).
 * - **Desde el día 8**: lo que la persona eligió, solo si Mi Radar está encendido. Apagado, o sin saberlo, ninguno.
 *   - **Sin ningún día distinto**: una alarma DIARIA por hora, como en la semana 1 (`dia: null`).
 *   - **Con algún día distinto** (horas propias o sin Radar): una alarma SEMANAL por día y por hora de ese día
 *     (`dia` 1..7), igual que los hábitos con días distintos. Un día sin Radar no tiene ninguna.
 * - Antes del día 1, o sin día de programa, ninguno.
 *
 * **Tope de iOS.** El sistema solo guarda 64 avisos pendientes por app, y 7 días × 12 horas son 84. Los diarios nunca lo
 * pasan (12); los semanales sí podrían. Hoy la app es solo Android, que no tiene ese tope: si algún día sale en iOS, hay
 * que recortar acá (por ejemplo, avisar solo los próximos días) antes de programar.
 */
export function horasDeAviso(diaPrograma: number | null | undefined, miRadar: MiRadarApi | null | undefined): AvisoDeRadar[] {
  if (!CONFIG_RADAR.activo || diaPrograma == null) return [];
  if (diaPrograma >= CONFIG_RADAR.primerDia && diaPrograma <= CONFIG_RADAR.ultimoDia) {
    return horasConSlot().map(hora => ({ hora, dia: null }));
  }
  if (diaPrograma >= MI_RADAR.primerDia && miRadar?.encendido) {
    // Defensivo: el servidor ya las valida, pero un aviso fuera de 03–23 nunca debe sonar (`limpiarHoras`).
    if (!hayDiasPropios(miRadar)) return limpiarHoras(miRadar.horas).map(hora => ({ hora, dia: null }));
    return DIAS_ISO.flatMap(dia => horasDelDia(miRadar, dia).map(hora => ({ hora, dia })));
  }
  return [];
}

// ---------------------------------------------------------------------------------------------------------------
// Cómo se dice
// ---------------------------------------------------------------------------------------------------------------

/** `[9, 14, 20]` → `09:00, 14:00 y 20:00`. */
export function textoDeLasHoras(horas: readonly number[]): string {
  const textos = horas.map(horaEnPunto);
  if (textos.length <= 1) return textos.join('');
  return `${textos.slice(0, -1).join(', ')} y ${textos[textos.length - 1]}`;
}

/** `[6]` → `sáb`; `[6, 7]` → `sáb y dom`; `[1, 3, 5]` → `lun, mié y vie`. */
export function textoDeLosDias(dias: readonly DiaIso[]): string {
  const nombres = dias.map(d => NOMBRE_CORTO_DEL_DIA[d]);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * La línea de la fila de Yo y de la ficha: `Apagado`, o `Encendido · 09:00, 14:00 y 20:00` y, si algún día va distinto,
 * lo que cambia agrupando los días que quedan igual: `… · sáb 11:00 · dom sin Radar`, `… · lun, mié y vie 08:00`.
 * Si todos los días son iguales es exactamente la de antes. Es una sola línea; si es larga, quien la dibuja la parte en
 * renglones y nunca la corta.
 */
export function textoDeMiRadar(config: MiRadarApi): string {
  if (!config.encendido) return 'Apagado';
  const generales = limpiarHoras(config.horas);
  const partes = [generales.length > 0 ? `Encendido · ${textoDeLasHoras(generales)}` : 'Encendido'];
  const grupos = new Map<string, { dias: DiaIso[]; horas: number[] }>();
  for (const { dia, horas } of diasConHorasPropias(config)) {
    const grupo = grupos.get(horas.join(','));
    if (grupo) grupo.dias.push(dia);
    else grupos.set(horas.join(','), { dias: [dia], horas });
  }
  for (const { dias, horas } of grupos.values()) {
    partes.push(`${textoDeLosDias(dias)} ${horas.length > 0 ? textoDeLasHoras(horas) : 'sin Radar'}`);
  }
  return partes.join(' · ');
}

/** La línea de la ficha de quien acompaña: `Mi Radar: encendido · 09:00, 14:00 y 20:00` o `Mi Radar: apagado`. */
export function textoDeMiRadarEnLaFicha(config: MiRadarApi): string {
  return `Mi Radar: ${textoDeMiRadar(config).replace(/^./, primera => primera.toLowerCase())}`;
}

/**
 * La hora de un registro: `Prevista 14:00 · respondida 14:06` si respondía a una hora elegida, o solo `14:06`.
 * `hora` es la hora local en que se respondió (`HH:mm`); si no se pudo leer, el guion es literal.
 */
export function textoDeLaHoraDelRegistro(hora: string | null, horaPrevista: number | null | undefined): string {
  const respondida = hora ?? '—';
  return horaPrevista == null ? respondida : `Prevista ${horaEnPunto(horaPrevista)} · respondida ${respondida}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Hoy
// ---------------------------------------------------------------------------------------------------------------

/** Una línea de «Hoy»: un registro, o una hora elegida que ya pasó sin respuesta. */
export type ElementoDeHoy =
  | { tipo: 'registro'; registro: RegistroRadarApi }
  | { tipo: 'sin-registro'; hora: number };

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Lo de hoy **en orden de hora, del más temprano al más tarde** (cuarta ronda: se lee como el día, de la mañana a la
 * noche): cada registro de hoy (también los hechos en una hora que no se eligió) y cada hora elegida que **ya pasó** sin
 * respuesta, que se dice «Sin registro» a secas, sin palabras de falta ni de culpa. Los registros van por la hora en que se
 * respondieron y los «Sin registro» por su hora en punto.
 *
 * `horasElegidas` son las de HOY (`horasDelDia(config, díaDeHoy)`): un día con horas propias o sin Radar no usa las de
 * todos. La hora en curso no cuenta como pasada: todavía se puede responder. Un registro responde a una hora elegida por
 * su `horaPrevista` (la calcula el servidor al registrar), no por cuándo se hizo.
 */
export function elementosDeHoy(
  horasElegidas: readonly number[],
  registros: readonly RegistroRadarApi[],
  ahora: Date,
): ElementoDeHoy[] {
  const deHoy = registros.filter(r => {
    const cuando = new Date(r.createdAt);
    return !Number.isNaN(cuando.getTime()) && mismoDia(cuando, ahora);
  });
  const respondidas = new Set(deHoy.map(r => r.horaPrevista).filter((h): h is number => h != null));
  const minutos = (e: ElementoDeHoy) => {
    if (e.tipo === 'sin-registro') return e.hora * 60;
    const cuando = new Date(e.registro.createdAt);
    return cuando.getHours() * 60 + cuando.getMinutes();
  };
  const elementos: ElementoDeHoy[] = [
    ...deHoy.map(registro => ({ tipo: 'registro' as const, registro })),
    ...horasElegidas
      .filter(h => h < ahora.getHours() && !respondidas.has(h))
      .map(hora => ({ tipo: 'sin-registro' as const, hora })),
  ];
  return elementos.sort((a, b) => minutos(a) - minutos(b));
}

// ---------------------------------------------------------------------------------------------------------------
// Patrones
// ---------------------------------------------------------------------------------------------------------------

export interface EnergiaDeUnaHora {
  /** La hora en punto, en la zona del teléfono. */
  hora: number;
  /** Energía promedio de 1 a 10. */
  promedio: number;
  /** En cuántos registros se apoya. */
  registros: number;
}

export interface PatronesDeMiRadar {
  /** Cuántos registros se miraron. */
  registros: number;
  /** Con menos de `MI_RADAR.minimoParaPatrones` no se muestra ninguno. */
  hayPatrones: boolean;
  masEnergia: EnergiaDeUnaHora | null;
  menosEnergia: EnergiaDeUnaHora | null;
  /** En cuántos de los registros dijo que evitaba algo, con el último ejemplo (el más reciente). */
  evitando: { cuantos: number; de: number; ejemplo: string } | null;
}

const SIN_PATRONES: Omit<PatronesDeMiRadar, 'registros' | 'hayPatrones'> = {
  masEnergia: null,
  menosEnergia: null,
  evitando: null,
};

/** Sin tildes, mayúsculas ni signos: para comparar lo que la persona escribió. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Las respuestas a «¿Qué evito?» que dicen que no hay nada. El formulario obliga a escribir algo, así que «nada» es
 * una respuesta común: contarla como «evitaba algo» inflaría el patrón. Es una lista corta y a propósito: solo lo
 * inequívoco, y lo dudoso cuenta como que sí evitaba algo.
 */
const NO_EVITABA_NADA: ReadonlySet<string> = new Set([
  'nada',
  'ninguno',
  'ninguna',
  'no',
  'nada en particular',
  'nada de nada',
  'no evito',
  'no evito nada',
  'no estoy evitando',
  'no estoy evitando nada',
]);

export function evitabaAlgo(respuesta: string): boolean {
  const limpia = normalizar(respuesta);
  return limpia.length > 0 && !NO_EVITABA_NADA.has(limpia);
}

const unDecimal = (n: number) => Math.round(n * 10) / 10;

/** El ejemplo es una respuesta de hasta 2 000 caracteres: en la lista de patrones se lee un trozo. */
const LARGO_DEL_EJEMPLO = 120;
const acortar = (texto: string) => (texto.length > LARGO_DEL_EJEMPLO ? `${texto.slice(0, LARGO_DEL_EJEMPLO).trimEnd()}…` : texto);

/**
 * Los patrones de los registros que hay: la hora con más y la de menos energía promedio, y cuántas veces dijo que
 * evitaba algo. **Salen solo de registros existentes y cada uno dice en cuántos se apoya.**
 *
 * - Con menos de `minimoParaPatrones` registros no hay ninguno.
 * - La energía solo mira las horas con al menos `minimoPorHora` registros, y pide dos horas distintas con promedios
 *   distintos: con una sola, «más» y «menos» serían la misma hora. En un empate gana la hora más temprana.
 * - La hora es la del teléfono, como en el resto del Radar.
 */
export function patronesDeMiRadar(registros: readonly RegistroRadarApi[]): PatronesDeMiRadar {
  const total = registros.length;
  if (total < MI_RADAR.minimoParaPatrones) return { registros: total, hayPatrones: false, ...SIN_PATRONES };

  const porHora = new Map<number, number[]>();
  for (const r of registros) {
    const hora = new Date(r.createdAt).getHours();
    if (Number.isNaN(hora)) continue;
    porHora.set(hora, [...(porHora.get(hora) ?? []), r.energyLevel]);
  }
  const horas: EnergiaDeUnaHora[] = [...porHora.entries()]
    .filter(([, niveles]) => niveles.length >= MI_RADAR.minimoPorHora)
    .map(([hora, niveles]) => ({
      hora,
      promedio: unDecimal(niveles.reduce((a, b) => a + b, 0) / niveles.length),
      registros: niveles.length,
    }))
    .sort((a, b) => a.hora - b.hora);

  let masEnergia: EnergiaDeUnaHora | null = null;
  let menosEnergia: EnergiaDeUnaHora | null = null;
  if (horas.length >= 2) {
    masEnergia = horas.reduce((mejor, h) => (h.promedio > mejor.promedio ? h : mejor));
    menosEnergia = horas.reduce((peor, h) => (h.promedio < peor.promedio ? h : peor));
    if (masEnergia.promedio === menosEnergia.promedio) {
      masEnergia = null;
      menosEnergia = null;
    }
  }

  const conEvitacion = registros
    .filter(r => evitabaAlgo(r.whatAmIAvoiding))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const evitando =
    conEvitacion.length > 0
      ? { cuantos: conEvitacion.length, de: total, ejemplo: acortar(conEvitacion[0].whatAmIAvoiding.trim()) }
      : null;

  return { registros: total, hayPatrones: true, masEnergia, menosEnergia, evitando };
}

/** `Más energía a las 14:00 · promedio 7.5, en 4 registros`. */
export function textoDeEnergia(tipo: 'mas' | 'menos', p: EnergiaDeUnaHora): string {
  const quien = tipo === 'mas' ? 'Más energía' : 'Menos energía';
  return `${quien} a las ${horaEnPunto(p.hora)} · promedio ${p.promedio}, en ${textoDeRegistros(p.registros)}`;
}

/** `Dijiste que evitabas algo en 3 de 12 registros`. */
export function textoDeEvitar(e: { cuantos: number; de: number }): string {
  return `Dijiste que evitabas algo en ${e.cuantos} de ${e.de} registros`;
}

export function textoDeRegistros(n: number): string {
  return n === 1 ? '1 registro' : `${n} registros`;
}

/** Lo que se dice cuando todavía no hay patrones: `Con 2 registros todavía no hay patrones. Aparecen desde 3.` */
export function textoSinPatrones(total: number): string {
  return `Con ${textoDeRegistros(total)} todavía no hay patrones. Aparecen desde ${MI_RADAR.minimoParaPatrones}.`;
}
