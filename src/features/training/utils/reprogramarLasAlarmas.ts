import * as habitsApi from '../../habits/api/habitsApi';
import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import type { PreferenciaHabitoApi } from '../../habits/types/habits.types';

/**
 * Después de cambiar lo planificado «solo esta semana» (o de repetir o deshacer una semana), las alarmas de ESTE teléfono se ponen al
 * día con lo que dice el servidor (spec 028): se relee `GET /habit-preferences` —que trae las fechas con cambio propio, `dateOverrides`—
 * y `ajustarRecordatoriosAlServidor` deja las alarmas como corresponde (el frente de alarmas lo hace sensible a esas fechas). Es la
 * misma puesta al día que corre al abrir la app, solo que acá se pide en el acto para que lo que la persona acaba de cambiar suene
 * bien sin esperar a la próxima apertura.
 *
 * Nunca lanza: un fallo de red o de permiso no puede tumbar un guardado que ya salió bien. Sin alarmas locales (web, Expo Go) solo
 * devuelve las preferencias leídas.
 */
export interface ResultadoDeReprogramar {
  /** Lo que dice el servidor ahora, o `null` si no se pudo leer. */
  preferencias: PreferenciaHabitoApi[] | null;
  /** `true` si las alarmas quedaron al día, `false` si falló al armarlas, `null` si no correspondía (sin alarmas locales o sin lectura). */
  alarmas: boolean | null;
}

export async function reprogramarLasAlarmasConElServidor(
  userId: string,
  opciones: {
    /** Solo las alarmas de este hábito; sin él, las de todos (repetir o deshacer una semana toca a varios). */
    habitoId?: string;
    dimensionDe?: (habitoId: string) => string | null;
  } = {},
): Promise<ResultadoDeReprogramar> {
  let preferencias: PreferenciaHabitoApi[];
  try {
    preferencias = await habitsApi.obtenerPreferencias();
  } catch {
    return { preferencias: null, alarmas: null };
  }
  if (!recordatorios.HAY_RECORDATORIOS_LOCALES) return { preferencias, alarmas: null };
  const aplicables = opciones.habitoId ? preferencias.filter(p => p.habitId === opciones.habitoId) : preferencias;
  try {
    await recordatorios.ajustarRecordatoriosAlServidor(userId, aplicables, { dimensionDe: opciones.dimensionDe });
    return { preferencias, alarmas: true };
  } catch {
    return { preferencias, alarmas: false };
  }
}
