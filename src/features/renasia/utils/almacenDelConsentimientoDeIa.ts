import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CLAVE_DEL_CONSENTIMIENTO_DE_IA as CLAVE,
  esConsentimientoVigente,
  VERSION_DEL_CONSENTIMIENTO_DE_IA,
} from '../utils/consentimientoDeIa';

/** Lo guardado en el teléfono (spec 060 FR-004): por cuenta y por versión del texto. */
export async function leerConsentimientoDeIa(userId: string): Promise<boolean> {
  try {
    return esConsentimientoVigente(await AsyncStorage.getItem(CLAVE + userId));
  } catch {
    return false;
  }
}

export async function guardarConsentimientoDeIa(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CLAVE + userId,
      JSON.stringify({ version: VERSION_DEL_CONSENTIMIENTO_DE_IA, aceptadoEn: new Date().toISOString() }),
    );
  } catch {
    // Si no se puede guardar, se vuelve a preguntar la próxima vez: nunca se envía sin que lo haya aceptado.
  }
}
