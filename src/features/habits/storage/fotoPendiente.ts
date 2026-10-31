import AsyncStorage from '@react-native-async-storage/async-storage';

import { destinoDeEvidencia, type DestinoDeFoto } from '../utils/destinoDeFoto';
import type { MedicionPedida } from '../utils/registroConFoto';

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

export type FotoPendiente = {
  registroId: string;
  titulo: string;
  conPregunta: boolean;
  /** D-178: `'roca'` si era una acción del día. Lo guardado por una versión anterior no lo trae: hábito. */
  destino?: DestinoDeFoto;
  /**
   * #42: lo que se sabía de si el registro pide los km al abrir la cámara (`null`: no pide nada; un objeto: los
   * pide). Sin el campo —lo guardado por una versión anterior, o un valor roto— no se sabe. Si al volver no se puede
   * leer el registro, esto evita abrir el hábito de kilómetros sin su campo.
   */
  medicion?: MedicionPedida | null;
  guardadaEnMs: number;
};

function esMedicion(valor: unknown): valor is MedicionPedida {
  const v = valor as Partial<MedicionPedida> | null;
  return v?.unidad === 'KILOMETROS' && typeof v.totalPrevio === 'number' && Number.isFinite(v.totalPrevio);
}

/** `null` y una medición válida se conservan; cualquier otra cosa es «no se sabe». */
function medicionGuardada(valor: unknown): MedicionPedida | null | undefined {
  if (valor === null) return null;
  return esMedicion(valor) ? { unidad: 'KILOMETROS', totalPrevio: valor.totalPrevio } : undefined;
}

function esFotoPendiente(valor: unknown): valor is FotoPendiente {
  const v = valor as Partial<FotoPendiente> | null;
  return (
    typeof v?.registroId === 'string' &&
    typeof v.titulo === 'string' &&
    typeof v.conPregunta === 'boolean' &&
    typeof v.guardadaEnMs === 'number' &&
    destinoDeEvidencia(v.destino) !== null
  );
}

export const fotoPendiente = {
  async guardar({ registroId, titulo, conPregunta, destino, medicion }: Omit<FotoPendiente, 'guardadaEnMs'>): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CLAVE,
        JSON.stringify({
          registroId,
          titulo,
          conPregunta,
          destino: destino ?? 'habito',
          // `undefined` no se guarda (JSON lo omite): al volver se lee como «no se sabe».
          medicion,
          guardadaEnMs: Date.now(),
        }),
      );
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
      if (ahoraMs - valor.guardadaEnMs > VIGENCIA_FOTO_PENDIENTE_MS) return null;
      const { medicion: medicionLeida, ...resto } = valor as FotoPendiente;
      const medicion = medicionGuardada(medicionLeida);
      return medicion === undefined ? resto : { ...resto, medicion };
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
