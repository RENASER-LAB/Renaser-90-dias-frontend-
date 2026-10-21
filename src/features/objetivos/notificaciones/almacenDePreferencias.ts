import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  leerPreferenciasDeAcciones,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  type PreferenciasDeAcciones,
} from './preferenciasPorDia';

/**
 * Las preferencias de los recordatorios de las acciones, guardadas en el teléfono, por cuenta (FR-007 de la spec 010:
 * sin servidor). Viven aparte de `recordatoriosDeAcciones.ts` para que quien arma repeticiones o canales las pueda
 * leer sin importar a ese módulo (que los importa a ellos).
 *
 * Son de la PERSONA, no de las alarmas: cerrar sesión no las borra (`alarmasDeLaCuenta`), así que al volver a entrar
 * el recordatorio por día se arma como estaba.
 */

const CLAVE_PREFERENCIAS = 'renaser.objetivos.recordatorios.preferencias.';

export async function preferenciasDeAcciones(userId: string): Promise<PreferenciasDeAcciones> {
  try {
    return leerPreferenciasDeAcciones(await AsyncStorage.getItem(CLAVE_PREFERENCIAS + userId));
  } catch {
    return PREFERENCIAS_DE_ACCIONES_POR_DEFECTO;
  }
}

export async function guardarPreferenciasDeAcciones(userId: string, p: PreferenciasDeAcciones): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_PREFERENCIAS + userId, JSON.stringify(p));
  } catch {
    // Guardar una preferencia no puede tumbar la pantalla.
  }
}
