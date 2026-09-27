import AsyncStorage from '@react-native-async-storage/async-storage';

import { esSonido, SONIDO_POR_DEFECTO, type SonidoDeAlarma } from './sonidoDeAlarma';

/**
 * Lo que la persona eligió en Yo → Alarmas y que vive **en este teléfono** (decisión del dueño del
 * 26/09: «sin tablas nuevas; preferencias existentes y el teléfono»).
 *
 * Es del teléfono y no del servidor a propósito: son alarmas LOCALES. Si la persona cambia de
 * teléfono, el nuevo no tiene esas alarmas programadas, así que tampoco tiene sentido que herede la
 * elección. Lo que sí es del servidor —si quiere o no el aviso push de eventos— es el interruptor
 * «Eventos y clases» de Notificaciones, que va a `notification-preferences`.
 */
export interface PreferenciasDeAlarmas {
  /** «Voy» programa una alarma en el teléfono. Apagado: no se programa ninguna y se quitan las que había. */
  eventosActivas: boolean;
  /** El sonido de las alarmas de eventos y de Despertar. */
  sonido: SonidoDeAlarma;
}

export const PREFERENCIAS_POR_DEFECTO: PreferenciasDeAlarmas = {
  eventosActivas: true,
  sonido: SONIDO_POR_DEFECTO,
};

const CLAVE = 'renaser.alarmas.preferencias.';

/** Lee lo guardado. Cualquier cosa rara (vacío, JSON roto, un valor nuevo) cae al valor por defecto. */
export function leerPreferencias(crudo: string | null): PreferenciasDeAlarmas {
  if (!crudo) return PREFERENCIAS_POR_DEFECTO;
  try {
    const leido = JSON.parse(crudo) as Partial<Record<keyof PreferenciasDeAlarmas, unknown>>;
    return {
      eventosActivas: typeof leido.eventosActivas === 'boolean' ? leido.eventosActivas : PREFERENCIAS_POR_DEFECTO.eventosActivas,
      sonido: esSonido(leido.sonido) ? leido.sonido : PREFERENCIAS_POR_DEFECTO.sonido,
    };
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}

export async function preferenciasDeAlarmas(userId: string): Promise<PreferenciasDeAlarmas> {
  try {
    return leerPreferencias(await AsyncStorage.getItem(CLAVE + userId));
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}

export async function guardarPreferenciasDeAlarmas(
  userId: string,
  preferencias: PreferenciasDeAlarmas,
): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE + userId, JSON.stringify(preferencias));
  } catch {
    // Guardar una preferencia no puede tumbar la pantalla: en el peor caso vuelve al valor por defecto.
  }
}
