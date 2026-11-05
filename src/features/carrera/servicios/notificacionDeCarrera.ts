import { Platform } from 'react-native';

import { cargarNotificaciones } from '../../habits/notificaciones/recordatoriosDeHabito';
import { formatoDuracion } from '../utils/ritmoYCalorias';
import { lineaDeLaNotificacion, TEXTOS_DE_LA_NOTIFICACION } from '../utils/textosDeLaCarrera';
import { ACCION_ABRIR, ACCION_PAUSAR, CANAL_CARRERA, CATEGORIA_CARRERA, ID_NOTIFICACION_CARRERA } from '../utils/avisoDeCarrera';

export { ACCION_ABRIR, ACCION_PAUSAR, esAvisoDeCarrera, ID_NOTIFICACION_CARRERA } from '../utils/avisoDeCarrera';

/**
 * La notificación fija de la carrera fuera de la app (FR-011): km, tiempo y ritmo, con «Pausar» y «Abrir».
 *
 * Por qué una notificación propia y no la del servicio: la del servicio en primer plano de `expo-location` (la que exige Android
 * para el GPS) no admite acciones y solo se puede cambiar con la app al frente. Esta se actualiza desde la tarea del GPS como mucho
 * cada 10 s, en un canal silencioso. Sus dos botones abren la app («Pausar» además pausa): una acción que corra sin abrir la app
 * pediría un módulo nativo (queda anotado en el informe).
 */

const CADA_MS = 10_000;

let preparada = false;
let ultimaMs = 0;

async function preparar(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const N = cargarNotificaciones();
  if (!N) return false;
  if (preparada) return true;
  try {
    await N.setNotificationChannelAsync(CANAL_CARRERA, {
      name: 'Carrera en curso',
      importance: N.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      enableVibrate: false,
      showBadge: false,
    });
    await N.setNotificationCategoryAsync(CATEGORIA_CARRERA, [
      { identifier: ACCION_PAUSAR, buttonTitle: TEXTOS_DE_LA_NOTIFICACION.pausar, options: { opensAppToForeground: true } },
      { identifier: ACCION_ABRIR, buttonTitle: TEXTOS_DE_LA_NOTIFICACION.abrir, options: { opensAppToForeground: true } },
    ]);
    preparada = true;
    return true;
  } catch {
    return false;
  }
}

/** Muestra o actualiza la notificación (como mucho cada 10 s, salvo `forzar`). Nunca lanza. */
export async function mostrarNotificacionDeCarrera(
  datos: { metros: number; activoMs: number; ritmo: number | null; enPausa: boolean },
  ahora = Date.now(),
  forzar = false,
): Promise<void> {
  if (!forzar && ahora - ultimaMs < CADA_MS) return;
  if (!(await preparar())) return;
  ultimaMs = ahora;
  const N = cargarNotificaciones();
  try {
    await N?.scheduleNotificationAsync({
      identifier: ID_NOTIFICACION_CARRERA,
      content: {
        title: datos.enPausa ? `${TEXTOS_DE_LA_NOTIFICACION.titulo} · en pausa` : TEXTOS_DE_LA_NOTIFICACION.titulo,
        body: lineaDeLaNotificacion(datos.metros, formatoDuracion(datos.activoMs), datos.ritmo),
        sticky: true,
        autoDismiss: false,
        sound: false,
        categoryIdentifier: CATEGORIA_CARRERA,
        data: { carrera: true },
      },
      trigger: { channelId: CANAL_CARRERA } as never,
    });
  } catch {
    // Sin permiso de avisos: la carrera sigue; queda la notificación del servicio del GPS.
  }
}

export async function quitarNotificacionDeCarrera(): Promise<void> {
  ultimaMs = 0;
  const N = cargarNotificaciones();
  try {
    await N?.dismissNotificationAsync(ID_NOTIFICACION_CARRERA);
  } catch {
    // Nada que quitar.
  }
}
