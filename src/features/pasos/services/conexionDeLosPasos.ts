import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Si la persona aceptó la hoja «Cuenta tus km solo» en este teléfono, y cuándo (spec 037, D-310). Es el consentimiento que pide
 * Google Play para datos de salud: la hoja dice que el mentor y el ranking ven el total de km, y «Conectar» es aceptarlo.
 * El permiso de Health Connect es aparte y lo guarda el sistema.
 *
 * AsyncStorage y por cuenta: dos personas en el mismo teléfono no comparten el consentimiento. Nada de aquí puede tumbar la
 * pantalla: un almacenamiento roto se lee como «sin conectar».
 */

export interface ConexionDeLosPasos {
  /** Instante en que se conectó (ISO), o `null` si no está conectado. */
  conectadoEn: string | null;
}

const PREFIJO = 'renaser.pasos.conexion.';

const claveDe = (cuentaId: string) => `${PREFIJO}${cuentaId}`;

export async function leerLaConexion(cuentaId: string): Promise<ConexionDeLosPasos> {
  try {
    const crudo = await AsyncStorage.getItem(claveDe(cuentaId));
    if (!crudo) return { conectadoEn: null };
    const dato = JSON.parse(crudo) as { conectadoEn?: unknown };
    return { conectadoEn: typeof dato.conectadoEn === 'string' && !Number.isNaN(Date.parse(dato.conectadoEn)) ? dato.conectadoEn : null };
  } catch {
    return { conectadoEn: null };
  }
}

export async function guardarLaConexion(cuentaId: string, ahora: Date): Promise<void> {
  try {
    await AsyncStorage.setItem(claveDe(cuentaId), JSON.stringify({ conectadoEn: ahora.toISOString() }));
  } catch {
    /* sin almacenamiento la persona vuelve a ver «Cuenta tus pasos solo»: no se rompe nada */
  }
}

export async function borrarLaConexion(cuentaId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(claveDe(cuentaId));
  } catch {
    /* ídem */
  }
}
