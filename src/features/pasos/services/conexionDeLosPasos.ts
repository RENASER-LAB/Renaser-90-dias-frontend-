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

/**
 * La nota «la persona tocó Conectar y se abrió el diálogo del sistema» (issue #127). Se anota ANTES de abrirlo y se borra al terminar.
 * Existe para un caso: Android mató la app (poca memoria, ahorro de batería) mientras el diálogo estaba abierto; la persona aceptó, el
 * sistema guardó el permiso, pero la respuesta se perdió con el proceso y la conexión nunca se anotó. Con esta nota, al volver, la app
 * ve el permiso concedido y termina de conectar sin pedir nada otra vez. Vale poco tiempo: pasado el límite ya no es «lo que la persona
 * acaba de hacer» y no se conecta nada solo.
 */
const PREFIJO_DEL_INTENTO = 'renaser.pasos.intento.';
export const VIGENCIA_DEL_INTENTO_MS = 15 * 60 * 1000;

const claveDelIntento = (cuentaId: string) => `${PREFIJO_DEL_INTENTO}${cuentaId}`;

export async function anotarElIntento(cuentaId: string, ahora: Date): Promise<void> {
  try {
    await AsyncStorage.setItem(claveDelIntento(cuentaId), ahora.toISOString());
  } catch {
    /* sin almacenamiento solo se pierde la recuperación automática: la persona vuelve a tocar «Conectar» */
  }
}

export async function hayUnIntentoReciente(cuentaId: string, ahora: Date): Promise<boolean> {
  try {
    const crudo = await AsyncStorage.getItem(claveDelIntento(cuentaId));
    if (!crudo) return false;
    const cuando = Date.parse(crudo);
    if (Number.isNaN(cuando)) return false;
    const pasado = ahora.getTime() - cuando;
    return pasado >= 0 && pasado <= VIGENCIA_DEL_INTENTO_MS;
  } catch {
    return false;
  }
}

export async function borrarElIntento(cuentaId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(claveDelIntento(cuentaId));
  } catch {
    /* ídem */
  }
}
