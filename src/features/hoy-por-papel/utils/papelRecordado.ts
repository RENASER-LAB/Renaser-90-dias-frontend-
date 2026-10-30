import AsyncStorage from '@react-native-async-storage/async-storage';

import { aPapel, type PapelDeHoy } from './papelesDeHoy';

/**
 * Qué papel de Hoy eligió la persona la última vez (spec 018). Clave por cuenta, como la vista de Eventos y los
 * borradores: en un mismo teléfono pasan varias cuentas y la elección de una no es de la otra. AsyncStorage y no
 * SecureStore: es una preferencia de pantalla, no una credencial. Si el almacenamiento falla, se degrada a «sin
 * elección»: nunca tumba Hoy.
 */

const PREFIJO = 'renaser.hoy.papel.';

export async function leerPapelRecordado(userId: string): Promise<PapelDeHoy | null> {
  try {
    return aPapel(await AsyncStorage.getItem(PREFIJO + userId));
  } catch {
    return null;
  }
}

export async function guardarPapelRecordado(userId: string, papel: PapelDeHoy): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIJO + userId, papel);
  } catch {
    // Una preferencia que no se guarda no es un error que la persona tenga que ver.
  }
}
