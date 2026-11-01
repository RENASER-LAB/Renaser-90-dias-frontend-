import AsyncStorage from '@react-native-async-storage/async-storage';

import { leerRespuestas } from '../api/diagnosticoSchemas';
import type { RespuestaDelDiagnostico } from '../types/diagnostico.types';

/**
 * Lo que la persona escribe en el paso en curso, guardado en el teléfono (spec 026, FR-009) para no perderlo si cierra la app
 * antes de tocar «Siguiente» (que es cuando se manda al servidor).
 *
 * - **Clave por usuario y versión**: `renaser.diagnostico.<usuario>.<versión>`. En el mismo teléfono pasan varias cuentas, y
 *   una versión nueva del diagnóstico no debe heredar lo escrito en la anterior.
 * - **Solo el paso en curso**: al guardar un paso en el servidor se borra o se reescribe con el siguiente. Es un respaldo, no
 *   la fuente de la verdad: lo del servidor ya está a salvo.
 * - **Nunca rompe**: cualquier fallo de almacenamiento (lleno, JSON corrupto, sin permiso) se lee como «no hay borrador». La
 *   app funciona igual sin él.
 * - AsyncStorage y no SecureStore: no es una credencial, y un párrafo largo supera el límite de ~2 KB de SecureStore.
 */

export interface BorradorDelDiagnostico {
  /** El paso en que estaba la persona al escribir. */
  paso: number;
  respuestas: RespuestaDelDiagnostico[];
  guardadoEn: string;
}

export function claveDelBorrador(usuarioId: string, version: number): string {
  return `renaser.diagnostico.${usuarioId}.${version}`;
}

export async function leerBorrador(usuarioId: string, version: number): Promise<BorradorDelDiagnostico | null> {
  try {
    const crudo = await AsyncStorage.getItem(claveDelBorrador(usuarioId, version));
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as { paso?: unknown; respuestas?: unknown; guardadoEn?: unknown } | null;
    if (!dato || typeof dato !== 'object') return null;
    return {
      paso: typeof dato.paso === 'number' && Number.isFinite(dato.paso) ? dato.paso : 0,
      respuestas: leerRespuestas(dato.respuestas),
      guardadoEn: typeof dato.guardadoEn === 'string' ? dato.guardadoEn : '',
    };
  } catch {
    return null;
  }
}

export async function guardarBorrador(
  usuarioId: string,
  version: number,
  paso: number,
  respuestas: RespuestaDelDiagnostico[],
): Promise<void> {
  try {
    const borrador: BorradorDelDiagnostico = { paso, respuestas, guardadoEn: new Date().toISOString() };
    await AsyncStorage.setItem(claveDelBorrador(usuarioId, version), JSON.stringify(borrador));
  } catch {
    // Sin borrador: la persona sigue, solo que lo escrito no sobrevive a un cierre de la app.
  }
}

export async function borrarBorrador(usuarioId: string, version: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(claveDelBorrador(usuarioId, version));
  } catch {
    // Nada que hacer: un borrador viejo se pisa con el siguiente.
  }
}
