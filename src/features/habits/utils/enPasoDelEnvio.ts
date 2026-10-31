/**
 * Anota en el registro de la app (Metro, `adb logcat`) en qué paso del envío falló y por qué, y vuelve a lanzar el MISMO
 * error. La pantalla solo dice «No se pudo registrar…» para todo lo que no es un `ApiError` (leer el archivo, el PUT a S3,
 * una excepción local), así que sin esto un «Reintentar» que sigue fallando no deja ninguna pista (#51).
 *
 * Aparte, sin dependencias, para que las reglas puras de `registroConFoto` puedan usarla sin arrastrar la capa de red.
 */
export async function enPasoDelEnvio<T>(paso: string, accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (error) {
    console.warn(`[evidencia] falló el paso «${paso}»:`, error);
    throw error;
  }
}
