import AsyncStorage from '@react-native-async-storage/async-storage';

import { fechaCompacta } from './utils/repeticionesDeAlarma';

/**
 * La nota de «este hábito se cumplió hoy» (issue #33, 2026-10-27), por cuenta y por hábito. Es lo que le dice a
 * `recordatoriosDeHabito.programar` que hoy no tiene que sonar nada de ese hábito aunque lo reprogramen (Plan, Training,
 * la puesta al día), y lo que le dice a la puesta al día si el puente de alarmas de fecha tiene que armarse, quedarse o
 * volver al esquema que se repite.
 *
 * Dos datos, y por eso no es solo una fecha:
 *
 * - `dia` (`AAAAMMDD`): el día, en la hora del teléfono, en que se cumplió. Solo cuenta si es el de hoy.
 * - `puenteDe`: el día para el que hay un puente armado en el teléfono (alarmas de fecha en lugar de las que se repiten), o
 *   `null`. Distinto de `dia` a propósito: un puente armado un martes sigue en pie el miércoles si la app no se abrió, y
 *   entonces tiene que desarmarse aunque la nota de hoy diga otra cosa. La regla es «puente armado si y solo si se cumplió
 *   hoy y todavía quedan avisos» (`puenteQueCorresponde`): lo armado se compara con eso.
 *
 * Es del teléfono: cerrar sesión la borra (`alarmasDeLaCuenta`) junto con las alarmas. Sin esto, la puesta al día de otra
 * cuenta (o del día siguiente) no sabría de un puente que ya no corresponde. Una nota vieja sin puente se limpia sola.
 */

export const PREFIJO_DE_CUMPLIDOS = 'renaser.habitos.cumplido.';

export interface NotaDeCumplido {
  /** `AAAAMMDD` del día en que se cumplió. */
  dia: string;
  /** `AAAAMMDD` del día para el que hay un puente armado, o `null`. */
  puenteDe: string | null;
}

const clave = (userId: string, habitoId: string) => `${PREFIJO_DE_CUMPLIDOS}${userId}.${habitoId}`;

async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

/** La nota del hábito, o `null` si no hay (o no se entiende). Nunca lanza. */
export async function leerNotaDeCumplido(userId: string, habitoId: string): Promise<NotaDeCumplido | null> {
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(clave(userId, habitoId));
    if (!crudo) return null;
    const leido = JSON.parse(crudo) as Partial<NotaDeCumplido> | null;
    if (!leido || typeof leido.dia !== 'string' || !/^\d{8}$/.test(leido.dia)) return null;
    const puenteDe = typeof leido.puenteDe === 'string' && /^\d{8}$/.test(leido.puenteDe) ? leido.puenteDe : null;
    return { dia: leido.dia, puenteDe };
  }, null);
}

async function escribir(userId: string, habitoId: string, nota: NotaDeCumplido): Promise<void> {
  await sinRomper(() => AsyncStorage.setItem(clave(userId, habitoId), JSON.stringify(nota)), undefined);
}

/**
 * Anota que el hábito se cumplió, en el día `dia` (`AAAAMMDD`; por defecto el de hoy). Conserva el puente que ya hubiera
 * armado: quien lo desarma es `cancelar`, y quien lo arma es la puesta de las alarmas.
 *
 * El día es el del HÁBITO, no el del reloj: Dormir cumplido a las 00:40 es del día anterior. Si no es el de hoy, no hay
 * nada que silenciar (los avisos de un día que ya pasó ya sonaron) y la nota no arma ningún puente.
 */
export async function anotarCumplido(userId: string, habitoId: string, dia: string = fechaCompacta(new Date())): Promise<void> {
  const anterior = await leerNotaDeCumplido(userId, habitoId);
  await escribir(userId, habitoId, { dia, puenteDe: anterior?.puenteDe ?? null });
}

/** Anota que hay un puente armado para ese día. Solo si el hábito tiene nota: sin ella no hay nada que conciliar. */
export async function anotarPuenteArmado(userId: string, habitoId: string, dia: string): Promise<void> {
  const nota = await leerNotaDeCumplido(userId, habitoId);
  if (nota) await escribir(userId, habitoId, { ...nota, puenteDe: dia });
}

/** Anota que ya no hay puente (se cancelaron las alarmas del hábito). Conserva el día en que se cumplió. */
export async function anotarPuenteDesarmado(userId: string, habitoId: string): Promise<void> {
  const nota = await leerNotaDeCumplido(userId, habitoId);
  if (nota && nota.puenteDe !== null) await escribir(userId, habitoId, { ...nota, puenteDe: null });
}

/** Borra la nota de un hábito. */
export async function quitarNotaDeCumplido(userId: string, habitoId: string): Promise<void> {
  await sinRomper(() => AsyncStorage.removeItem(clave(userId, habitoId)), undefined);
}
