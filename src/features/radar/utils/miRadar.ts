/**
 * Mi Radar (spec 012, rehecha por la 019): las decisiones puras, sin pantalla ni red.
 *
 * Qué horas avisan en cada día del programa, cuántas veces respondió hoy y cómo se dice todo eso. Lo que se prueba
 * acá es la regla; las pantallas solo la dibujan.
 *
 * **Las horas no se eligen**: el servidor las calcula con el Despertar y el Dormir de cada día y llegan en `dias[].horas`. Las
 * cuentas de las veces y del reparto, y el borrador de lo que se está tocando, están en `vecesDeMiRadar.ts`.
 *
 * **`horasDelDia(config, diaIso)` es la única que dice qué horas tiene un día**: «Hoy», el registrar, los avisos del teléfono y
 * el texto de la fila la usan, y ninguna otra mira `dias` por su cuenta.
 */
import { isoDe } from '../../habits/notificaciones/utils/alarmasPorDia';
import { CONFIG_RADAR, MI_RADAR } from '../config/configRadar';
import type { DiaDeMiRadarApi, MiRadarApi, RegistroRadarApi } from '../types/radar.types';
import { envioEnElMismoSlot, horaEnPunto, horasConSlot } from './slotsDelRadar';

/** ¿Desde este día del programa se puede tener Mi Radar? Con el Código Renaser apagado del todo, no. */
export function miRadarCorresponde(diaPrograma: number | null | undefined): boolean {
  return CONFIG_RADAR.activo && diaPrograma != null && diaPrograma >= MI_RADAR.primerDia;
}

// ---------------------------------------------------------------------------------------------------------------
// Las horas de cada día de la semana
// ---------------------------------------------------------------------------------------------------------------

/** Los siete días como los numera el contrato: ISO, lunes = 1 … domingo = 7. */
export const DIAS_ISO = [1, 2, 3, 4, 5, 6, 7] as const;
export type DiaIso = (typeof DIAS_ISO)[number];

/**
 * Las horas que valen: enteras, entre `primeraHora` y `ultimaHora`, sin repetir y en orden. Una hora fuera de eso nunca
 * debe sonar ni mostrarse, aunque el servidor (que también las valida) alguna vez la mandara.
 */
export function limpiarHoras(horas: readonly number[] | null | undefined): number[] {
  return [...new Set(horas ?? [])]
    .filter(h => Number.isInteger(h) && h >= MI_RADAR.primeraHora && h <= MI_RADAR.ultimaHora)
    .sort((a, b) => a - b);
}

/** Un día de la semana tal como lo resolvió el servidor, o `undefined` si esta lectura no lo trae (las fichas traen solo hoy). */
export function diaDeMiRadar(config: MiRadarApi | null | undefined, diaIso: number): DiaDeMiRadarApi | undefined {
  return config?.dias.find(d => d.dia === diaIso);
}

/**
 * Las horas en punto en que Mi Radar pregunta en un día de la semana (`diaIso`: lunes = 1 … domingo = 7), en orden: las que el
 * servidor calculó con el Despertar y el Dormir de ese día.
 *
 * - Apagado, o sin saberlo (`null`): ninguna.
 * - Un día sin horario (sin Despertar o sin Dormir), o que la persona apagó («Sin Radar»): ninguna.
 *
 * Es la única regla de «qué horas tiene este día»: «Hoy», «Registrar ahora», los avisos del teléfono y el resumen de la fila
 * la usan y ninguna otra.
 */
export function horasDelDia(config: MiRadarApi | null | undefined, diaIso: number): number[] {
  if (!config?.encendido) return [];
  return limpiarHoras(diaDeMiRadar(config, diaIso)?.horas);
}

/**
 * Una huella de lo que importa a los avisos: encendido y las horas de cada día. Leer lo mismo (al abrir Mi Radar, o con otra
 * fecha de hoy) no los reprograma ni reinicia lo que se está editando; el modo, las veces, el Despertar o el Dormir que cambian
 * las horas sí.
 */
export function claveDeMiRadar(config: MiRadarApi | null | undefined): string {
  if (!config) return '';
  return `${config.encendido ? 1 : 0}:${config.dias.map(d => `${d.dia}=${d.horas.join('.')}`).join(';')}`;
}

/** Un aviso del teléfono: a esa `hora` en punto, todos los días (`dia: null`, DIARIA) o solo ese día de la semana (`dia` ISO, SEMANAL). */
export interface AvisoDeRadar {
  hora: number;
  dia: DiaIso | null;
}

/**
 * Qué avisos suenan en el teléfono ese día del programa.
 *
 * - **Días 1 a 7**: las 12 de siempre, de 08:00 a 19:00, DIARIAS, tenga lo que tenga Mi Radar. Es exactamente lo que
 *   había antes de la spec 012 (FR-001).
 * - **Desde el día 8**: con Mi Radar encendido, **una alarma SEMANAL por hora y por día de la semana** de las que el servidor
 *   calculó (`dia` 1..7): cada día tiene su propio horario. Apagado, o sin saberlo, ninguna. Un día sin Radar no tiene ninguna.
 * - Antes del día 1, o sin día de programa, ninguno.
 *
 * Hasta 21 horas × 7 días = 147 alarmas pendientes. Android admite 500 por app; iOS, 64, pero la app es solo Android: si algún
 * día sale en iOS hay que recortar acá antes de programar.
 */
export function horasDeAviso(diaPrograma: number | null | undefined, miRadar: MiRadarApi | null | undefined): AvisoDeRadar[] {
  if (!CONFIG_RADAR.activo || diaPrograma == null) return [];
  if (diaPrograma >= CONFIG_RADAR.primerDia && diaPrograma <= CONFIG_RADAR.ultimoDia) {
    return horasConSlot().map(hora => ({ hora, dia: null }));
  }
  if (diaPrograma >= MI_RADAR.primerDia && miRadar?.encendido) {
    return DIAS_ISO.flatMap(dia => horasDelDia(miRadar, dia).map(hora => ({ hora, dia })));
  }
  return [];
}

// ---------------------------------------------------------------------------------------------------------------
// Cómo se dice
// ---------------------------------------------------------------------------------------------------------------

/** `1 vez`, `17 veces`. */
export function textoDeLasVeces(n: number): string {
  return n === 1 ? '1 vez' : `${n} veces`;
}

/** `05:30 a 22:30`, o `null` si falta alguna de las dos horas. */
export function textoDelHorario(dia: Pick<DiaDeMiRadarApi, 'despertar' | 'dormir'>): string | null {
  return dia.despertar && dia.dormir ? `${dia.despertar} a ${dia.dormir}` : null;
}

/** El día de HOY de la lectura (el que dice el servidor con `hoy`, o el del teléfono si no lo trae), si esta lectura lo trae. */
export function diaDeHoyDeMiRadar(config: MiRadarApi | null | undefined, ahora: Date = new Date()): DiaDeMiRadarApi | undefined {
  if (!config) return undefined;
  const delServidor = config.hoy ? config.dias.find(d => d.fecha === config.hoy) : undefined;
  return delServidor ?? diaDeMiRadar(config, isoDe(ahora));
}

/**
 * La línea de la fila de Yo y de la ficha, de HOY: `Apagado`, `Encendido · 05:30 a 22:30 · 17 veces` o, si hoy no tiene Radar
 * (sin Despertar o Dormir, o «Sin Radar»), `Encendido · hoy sin Radar`. Es una sola línea que, si es larga, quien la dibuja la
 * parte en renglones y nunca la corta.
 */
export function textoDeMiRadar(config: MiRadarApi, ahora: Date = new Date()): string {
  if (!config.encendido) return 'Apagado';
  const hoy = diaDeHoyDeMiRadar(config, ahora);
  if (!hoy) return 'Encendido';
  const horario = textoDelHorario(hoy);
  if (hoy.veces > 0 && horario) return `Encendido · ${horario} · ${textoDeLasVeces(hoy.veces)}`;
  return 'Encendido · hoy sin Radar';
}

/** La línea de la ficha de quien acompaña: `Mi Radar: encendido · 05:30 a 22:30 · 17 veces` o `Mi Radar: apagado`. */
export function textoDeMiRadarEnLaFicha(config: MiRadarApi, ahora: Date = new Date()): string {
  const texto = textoDeMiRadar(config, ahora).replace('hoy sin Radar', 'hoy no tiene Radar');
  return `Mi Radar: ${texto.replace(/^./, primera => primera.toLowerCase())}`;
}

/**
 * La hora de un registro: `Prevista 14:00 · respondida 14:06` si respondía a una hora de Mi Radar, o solo `14:06`.
 * `hora` es la hora local en que se respondió (`HH:mm`); si no se pudo leer, el guion es literal.
 */
export function textoDeLaHoraDelRegistro(hora: string | null, horaPrevista: number | null | undefined): string {
  const respondida = hora ?? '—';
  return horaPrevista == null ? respondida : `Prevista ${horaEnPunto(horaPrevista)} · respondida ${respondida}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Hoy
// ---------------------------------------------------------------------------------------------------------------

export function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Cuántas de las horas de HOY ya tienen su respuesta. Un registro responde a una hora de Mi Radar por su `horaPrevista` (la calcula el
 * servidor al registrar), no por cuándo se hizo; en la hora en curso, además, vale cualquier registro de esa hora. Es la misma cuenta de
 * `filasDeLasHorasDeHoy` («Tu Radar de hoy») y de la línea «Hoy: 4 de 6».
 */
export function respondidasDeHoy(horasDeHoy: readonly number[], registros: readonly RegistroRadarApi[], ahora: Date): number {
  const deHoy = registros.filter(r => {
    const cuando = new Date(r.createdAt);
    return !Number.isNaN(cuando.getTime()) && mismoDia(cuando, ahora);
  });
  const horaEnCurso = ahora.getHours();
  return horasDeHoy.filter(
    hora =>
      deHoy.some(r => r.horaPrevista === hora) ||
      (hora === horaEnCurso && deHoy.some(r => envioEnElMismoSlot(r.createdAt, ahora))),
  ).length;
}

/** En lugar de «Registrar ahora» en un día que va «Sin Radar» (el servidor lo rechazaría con un 409). */
export const HOY_SIN_RADAR = 'Hoy no tienes Mi Radar';

/** Lo que se dice cuando se intenta registrar de madrugada (el servidor responde lo mismo con un 409). */
export const FUERA_DE_HORARIO = `Mi Radar funciona de ${horaEnPunto(MI_RADAR.primeraHora)} a 23:59.`;

/** Lo que dice el formulario de Mi Radar bajo «Registrar»: se puede cerrar y lo escrito queda en el teléfono. */
export const TEXTO_DEL_PIE_DE_MI_RADAR = 'Puedes cerrarlo; tu borrador queda guardado en este teléfono.';

/**
 * Lo de HOY en Mi Radar, derivado de lo guardado, los registros leídos y el reloj. **Una sola cuenta** para Yo → Mi Radar
 * (`useMiRadar`) y la mitad del Radar de Hoy (spec 016): las dos dicen lo mismo de la hora en curso.
 *
 *  - `horasDeHoy`: las horas de HOY (`horasDelDia`): un día sin horario o «Sin Radar» no tiene ninguna.
 *  - `hoyTieneRadar`: encendido y este día de la semana tiene horas. Si no, no hay «Registrar ahora».
 *  - `respondidasHoy`: cuántas de las horas de hoy ya tienen su respuesta («Hoy: 4 de 6»).
 *  - `yaRegistroEstaHora`: hay un registro en la hora en curso.
 *  - `dentroDelHorario`: Mi Radar funciona de 03:00 a 23:59; de madrugada no se registra y la app no lo ofrece.
 *  - `horaEnCursoPendiente`: la hora en curso es una de las de hoy y todavía no tiene registro (lo que pide un aviso).
 */
export function resumenDeMiRadarHoy(config: MiRadarApi | null | undefined, registros: readonly RegistroRadarApi[], ahora: Date) {
  const horasDeHoy = horasDelDia(config, isoDe(ahora));
  const hoyTieneRadar = Boolean(config?.encendido) && horasDeHoy.length > 0;
  const respondidasHoy = hoyTieneRadar ? respondidasDeHoy(horasDeHoy, registros, ahora) : 0;
  const yaRegistroEstaHora = registros.some(r => envioEnElMismoSlot(r.createdAt, ahora));
  const dentroDelHorario = ahora.getHours() >= MI_RADAR.primeraHora;
  const horaEnCursoPendiente = hoyTieneRadar && horasDeHoy.includes(ahora.getHours()) && !yaRegistroEstaHora;
  return { horasDeHoy, hoyTieneRadar, respondidasHoy, yaRegistroEstaHora, dentroDelHorario, horaEnCursoPendiente };
}

/**
 * La línea de Yo → Mi Radar «Hoy: 4 de 6»: las veces que respondió hoy de las que le tocaban. `null` —no se muestra— con Mi Radar apagado,
 * sin Radar hoy o con 0 que tocan.
 */
export function lineaDeHoy(
  config: MiRadarApi | null | undefined,
  registros: readonly RegistroRadarApi[],
  ahora: Date,
): { texto: string; lectorDePantalla: string } | null {
  const { hoyTieneRadar, horasDeHoy, respondidasHoy } = resumenDeMiRadarHoy(config, registros, ahora);
  if (!hoyTieneRadar || horasDeHoy.length === 0) return null;
  const total = horasDeHoy.length;
  return {
    texto: `Hoy: ${respondidasHoy} de ${total}`,
    lectorDePantalla: `Hoy respondiste ${respondidasHoy} de ${total} ${total === 1 ? 'vez' : 'veces'}`,
  };
}
