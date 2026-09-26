import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Para qué registro se abrió la cámara (registro con foto, 2026-09-26).
 *
 * Android puede matar la actividad de la app mientras la cámara está abierta —con poca memoria
 * pasa en teléfonos de gama baja—. La foto no se pierde: `ImagePicker.getPendingResultAsync()` la
 * devuelve al volver. Lo que sí se pierde es el estado de React, o sea PARA QUÉ hábito era. Se
 * guarda acá justo antes de abrir la cámara y se borra apenas vuelve.
 *
 * AsyncStorage y no SecureStore: son dos ids y un título, nada sensible.
 */
const CLAVE = 'renaser:registro-con-foto:pendiente';

/** Pasado este tiempo, una foto pendiente ya no se ofrece: seguramente es de otro momento del día. */
export const VIGENCIA_FOTO_PENDIENTE_MS = 30 * 60_000;

export type FotoPendiente = { registroId: string; titulo: string; guardadaEnMs: number };

function esFotoPendiente(valor: unknown): valor is FotoPendiente {
  const v = valor as Partial<FotoPendiente> | null;
  return typeof v?.registroId === 'string' && typeof v.titulo === 'string' && typeof v.guardadaEnMs === 'number';
}

export const fotoPendiente = {
  async guardar(registroId: string, titulo: string): Promise<void> {
    try {
      await AsyncStorage.setItem(CLAVE, JSON.stringify({ registroId, titulo, guardadaEnMs: Date.now() }));
    } catch {
      // Best-effort: sin esto solo se pierde la recuperación tras un cierre de Android.
    }
  },

  /** La pendiente vigente, o `null`. La lee y la BORRA: se ofrece una sola vez. */
  async tomar(ahoraMs: number): Promise<FotoPendiente | null> {
    try {
      const crudo = await AsyncStorage.getItem(CLAVE);
      await AsyncStorage.removeItem(CLAVE);
      if (!crudo) return null;
      const valor: unknown = JSON.parse(crudo);
      if (!esFotoPendiente(valor)) return null;
      return ahoraMs - valor.guardadaEnMs <= VIGENCIA_FOTO_PENDIENTE_MS ? valor : null;
    } catch {
      return null;
    }
  },

  async borrar(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CLAVE);
    } catch {
      // Nada que hacer: a lo sumo queda vencida y `tomar` la descarta.
    }
  },
};
