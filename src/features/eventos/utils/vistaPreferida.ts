import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Qué vista de Eventos eligió la persona la última vez: «Calendario» o «Tarjetas» (pedido del dueño
 * del 2026-09-26). Sin elección guardada, «Calendario».
 *
 * Clave por usuario, como `almacenamientoLocal` y `borradorEspiritu`: en un mismo teléfono pasan
 * varias cuentas y la preferencia de una no es de la otra. AsyncStorage y no SecureStore: es una
 * preferencia de pantalla, no una credencial. Si el almacenamiento falla, se degrada al valor por
 * defecto: nunca tumba la sección.
 */

export type VistaDeEventos = 'calendario' | 'tarjetas';

export const VISTA_POR_DEFECTO: VistaDeEventos = 'calendario';

const PREFIJO = 'renaser.eventos.vista.';

/** Lo guardado, interpretado. Cualquier cosa rara (o nada) es la vista por defecto. */
export function aVista(crudo: string | null | undefined): VistaDeEventos {
  return crudo === 'tarjetas' || crudo === 'calendario' ? crudo : VISTA_POR_DEFECTO;
}

export async function leerVistaPreferida(userId: string): Promise<VistaDeEventos> {
  try {
    return aVista(await AsyncStorage.getItem(PREFIJO + userId));
  } catch {
    return VISTA_POR_DEFECTO;
  }
}

export async function guardarVistaPreferida(userId: string, vista: VistaDeEventos): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIJO + userId, vista);
  } catch {
    // Una preferencia que no se guarda no es un error que la persona tenga que ver.
  }
}
