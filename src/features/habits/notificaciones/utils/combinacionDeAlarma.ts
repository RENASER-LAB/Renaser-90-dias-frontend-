import {
  canalDeAlarma,
  conVibracion,
  sinVibracion,
  type CanalDeAlarma,
  type SonidoDeAlarma,
} from '../../../alarmas/sonidoDeAlarma';
import type { HabitoConVoz } from '../../../alarmas/vozDeLosHabitos';
import type { CombinacionDeAlarmaApi } from '../../types/habits.types';

/**
 * «Cómo suena» la alarma de un hábito (spec 009): cuatro interruptores —sonido, vibración, voz que dice el hábito
 * y repetir si no la atiendo—, que se eligen por día igual que la hora y el aviso (008). Pura: no toca la librería
 * ni el almacenamiento.
 *
 * ## Las capas (la misma resolución por capas de la hora y el aviso)
 *
 * General del hábito → día de la semana. Cada día puede traer la suya (`customAlarm` en el servidor); si no, sigue
 * la general. Sin nada guardado, la de siempre: sonido sí, vibración sí, voz no, repetir no. El servidor ya manda la
 * combinación RESUELTA de cada día, así que acá solo se elige entre la propia y la general.
 *
 * ## Del interruptor al canal (research R1)
 *
 * En Android el sonido y la vibración son del CANAL, no de la notificación, y un canal no se cambia después de
 * creado. La combinación decide por cuál canal sale la alarma, sin código nativo:
 *
 * | Sonido | Vibración | Voz | Canal |
 * |---|---|---|---|
 * | sí | sí | no | el del sonido de Yo → Alarmas (el de siempre) |
 * | sí | no | no | ese mismo + `-sinvib` (`enableVibrate: false`) |
 * | no | sí | — | «solo vibrar» (el que ya existía) |
 * | sí | sí/no | sí | el de voz del hábito (o la frase general), con o sin `-sinvib` |
 *
 * ## Dos decisiones para no cambiar lo que ya funciona
 *
 * - **Yo → Alarmas sigue mandando en el tono.** Con «Sonido» encendido suena el tono que se eligió allá. Si ese
 *   tono es «Voz», las alarmas siguen diciendo el hábito (la persona ya lo eligió, y el servidor no sabe de Yo
 *   → Alarmas: su `voice` por defecto es `false`). Si es «Solo vibrar», solo vibra, salvo que el hábito pida voz.
 * - **Una alarma nunca queda muda.** Si la combinación se queda sin sonido y sin vibración (el servidor no lo
 *   deja, pero un dato roto no debe callar una alarma), vibra.
 */

export interface CombinacionDeAlarma {
  sonido: boolean;
  vibracion: boolean;
  /** La voz dice el nombre del hábito. Necesita sonido. */
  voz: boolean;
  /** Vuelve a sonar a los 5 y a los 10 minutos de la hora del hábito si no se atiende. */
  repetir: boolean;
}

/** Lo que había antes de la spec 009: sonido y vibración, sin voz propia y sin repetir. */
export const COMBINACION_POR_DEFECTO: Readonly<CombinacionDeAlarma> = Object.freeze({
  sonido: true,
  vibracion: true,
  voz: false,
  repetir: false,
});

export const CLAVES_DE_LA_COMBINACION = ['sonido', 'vibracion', 'voz', 'repetir'] as const;
export type ClaveDeLaCombinacion = (typeof CLAVES_DE_LA_COMBINACION)[number];

const esBooleano = (x: unknown): x is boolean => typeof x === 'boolean';

/**
 * La combinación que manda el servidor (`{ sound, vibration, voice, repeat }`), o `null` si no viene o no se
 * entiende (un backend anterior no la manda: la app sigue como siempre).
 */
export function combinacionDeLaApi(crudo: CombinacionDeAlarmaApi | null | undefined): CombinacionDeAlarma | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const { sound, vibration, voice, repeat } = crudo as unknown as Record<string, unknown>;
  if (!esBooleano(sound) || !esBooleano(vibration) || !esBooleano(voice) || !esBooleano(repeat)) return null;
  return { sonido: sound, vibracion: vibration, voz: voice, repetir: repeat };
}

/** Lo que se manda al servidor. */
export function combinacionALaApi(c: CombinacionDeAlarma): CombinacionDeAlarmaApi {
  return { sound: c.sonido, vibration: c.vibracion, voice: c.voz, repeat: c.repetir };
}

/** La combinación guardada en el teléfono (dentro del aviso o en el almacenamiento), con la misma tolerancia. */
export function combinacionGuardada(crudo: unknown): CombinacionDeAlarma | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const { sonido, vibracion, voz, repetir } = crudo as Record<string, unknown>;
  if (!esBooleano(sonido) || !esBooleano(vibracion) || !esBooleano(voz) || !esBooleano(repetir)) return null;
  return { sonido, vibracion, voz, repetir };
}

export function mismaCombinacion(a: CombinacionDeAlarma, b: CombinacionDeAlarma): boolean {
  return a.sonido === b.sonido && a.vibracion === b.vibracion && a.voz === b.voz && a.repetir === b.repetir;
}

export function esLaCombinacionPorDefecto(c: CombinacionDeAlarma): boolean {
  return mismaCombinacion(c, COMBINACION_POR_DEFECTO);
}

/** La del día: la propia si la tiene; si no, la general; y si tampoco, la de siempre. */
export function combinacionDelDia(
  general: CombinacionDeAlarma | null | undefined,
  propia: CombinacionDeAlarma | null | undefined,
): CombinacionDeAlarma {
  return propia ?? general ?? { ...COMBINACION_POR_DEFECTO };
}

/** Una cadena corta y estable («1100»), para la firma de un plan de alarmas. */
export function codigoDeLaCombinacion(c: CombinacionDeAlarma): string {
  return CLAVES_DE_LA_COMBINACION.map(k => (c[k] ? '1' : '0')).join('');
}

/** Las reglas que el servidor también hace cumplir (400). */
export type ReglaIncumplida = 'sinSonidoNiVibracion' | 'vozSinSonido';

/** La primera regla que la combinación no cumple, o `null`. Primero la de sonido y vibración: es la que bloquea. */
export function reglaIncumplida(c: CombinacionDeAlarma): ReglaIncumplida | null {
  if (!c.sonido && !c.vibracion) return 'sinSonidoNiVibracion';
  if (c.voz && !c.sonido) return 'vozSinSonido';
  return null;
}

/**
 * Lo que de verdad pasa con la combinación, dado el tono de Yo → Alarmas (ver «Dos decisiones» arriba). Pura.
 *
 * - `sonido`: hay algo que suena. Con el tono «Solo vibrar» de Yo no suena nada, salvo que el hábito pida voz.
 * - `voz`: la pidió el hábito, o el tono de Yo es «Voz». Siempre necesita `sonido` encendido en la combinación.
 * - `vibracion`: la pedida, o vibra igual si no hay nada que suene (nunca una alarma muda).
 */
export function combinacionEfectiva(c: CombinacionDeAlarma, tonoDeYo: SonidoDeAlarma): CombinacionDeAlarma {
  const voz = c.sonido && (c.voz || tonoDeYo === 'voz');
  const sonido = c.sonido && (tonoDeYo !== 'vibrar' || voz);
  return { sonido, vibracion: c.vibracion || !sonido, voz, repetir: c.repetir };
}

/**
 * El canal de Android por el que sale una alarma con esta combinación (tabla de arriba). Siempre dice
 * explícitamente si vibra (`vibra`), para que un canal nuevo no dependa del valor por defecto del teléfono.
 *
 * @param tipo `habitos` es el único que hoy usa combinaciones; se deja el tipo por el nombre de los canales.
 * @param tonoDeYo el tono elegido en Yo → Alarmas.
 * @param habito para la voz: con él, dice su nombre (si es del catálogo y no fue renombrado); sin él, la frase general.
 */
export function canalDeLaCombinacion(
  tipo: Parameters<typeof canalDeAlarma>[0],
  tonoDeYo: SonidoDeAlarma,
  combinacion: CombinacionDeAlarma,
  habito?: HabitoConVoz,
): CanalDeAlarma {
  const e = combinacionEfectiva(combinacion, tonoDeYo);
  if (!e.sonido) return conVibracion(canalDeAlarma(tipo, 'vibrar'));
  const base = e.voz
    ? canalDeAlarma(tipo, 'voz', habito)
    // Con sonido y sin voz, el tono de Yo (aquí nunca es «Voz» ni «Solo vibrar»: ya se resolvieron arriba).
    : canalDeAlarma(tipo, tonoDeYo);
  return e.vibracion ? conVibracion(base) : sinVibracion(base);
}
