import { almacen } from './almacenamiento';

import { PREFERENCIAS_POR_DEFECTO, type EstadoDeLaCarrera, type PreferenciasDeLaCarrera } from '../types/carrera.types';

/**
 * Lo que la carrera guarda en el teléfono (FR-005): el estado en curso y las preferencias de voz, por cuenta. AsyncStorage en
 * Android escribe en una base SQLite propia de la app: sobrevive a que Android mate el proceso. Nada de aquí lanza: un
 * almacenamiento roto deja la carrera en memoria y la app sigue.
 *
 * La carrera en curso va en UNA clave (no por cuenta): la tarea del GPS en segundo plano no sabe quién tiene la sesión. La cuenta
 * va adentro y quien la lee la compara con la sesión de ahora.
 */

export const CLAVE_CARRERA_EN_CURSO = 'renaser.carrera.enCurso';
const PREFIJO_PREFERENCIAS = 'renaser.carrera.preferencias.';

export async function leerCarreraEnCurso(): Promise<EstadoDeLaCarrera | null> {
  try {
    const crudo = await almacen().getItem(CLAVE_CARRERA_EN_CURSO);
    if (!crudo) return null;
    const e = JSON.parse(crudo) as EstadoDeLaCarrera;
    return e && e.version === 1 && typeof e.carreraId === 'string' && typeof e.cuentaId === 'string' ? e : null;
  } catch {
    return null;
  }
}

export async function guardarCarreraEnCurso(e: EstadoDeLaCarrera): Promise<void> {
  try {
    await almacen().setItem(CLAVE_CARRERA_EN_CURSO, JSON.stringify(e));
  } catch {
    // Sin poder guardar, la carrera sigue en memoria: solo se perdería si Android mata la app.
  }
}

export async function borrarCarreraEnCurso(): Promise<void> {
  try {
    await almacen().removeItem(CLAVE_CARRERA_EN_CURSO);
  } catch {
    // Nada que hacer.
  }
}

export async function leerPreferencias(cuentaId: string): Promise<PreferenciasDeLaCarrera> {
  try {
    const crudo = await almacen().getItem(PREFIJO_PREFERENCIAS + cuentaId);
    if (!crudo) return PREFERENCIAS_POR_DEFECTO;
    const p = JSON.parse(crudo) as Partial<PreferenciasDeLaCarrera>;
    return {
      ...PREFERENCIAS_POR_DEFECTO,
      ...p,
      dice: { ...PREFERENCIAS_POR_DEFECTO.dice, ...(p.dice ?? {}) },
    };
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}

export async function guardarPreferencias(cuentaId: string, p: PreferenciasDeLaCarrera): Promise<void> {
  try {
    await almacen().setItem(PREFIJO_PREFERENCIAS + cuentaId, JSON.stringify(p));
  } catch {
    // Se quedan en memoria esta vez.
  }
}

/**
 * ¿Toca guardar? Como mucho cada 5 s o cada 10 puntos (FR-005): si Android mata el proceso se pierden, a lo sumo, esos segundos.
 */
export function tocaGuardar(puntosDesdeLaUltima: number, msDesdeLaUltima: number): boolean {
  return puntosDesdeLaUltima >= 10 || msDesdeLaUltima >= 5_000;
}
