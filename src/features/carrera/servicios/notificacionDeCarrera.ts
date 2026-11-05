import { Platform } from 'react-native';

import { cargarNotificaciones } from '../../habits/notificaciones/recordatoriosDeHabito';
import { formatoDuracion } from '../utils/ritmoYCalorias';
import { TEXTOS_DE_LA_NOTIFICACION } from '../utils/textosDeLaCarrera';
import {
  ACCION_ABRIR,
  ACCION_PAUSAR,
  ACCION_SEGUIR,
  CANAL_CARRERA,
  CATEGORIA_CARRERA,
  CATEGORIA_CARRERA_EN_PAUSA,
  ID_NOTIFICACION_CARRERA,
} from '../utils/avisoDeCarrera';
import { contenidoDeLaNotificacion, type DatosDeLaNotificacion } from '../utils/notificacionUnica';

export { ACCION_ABRIR, ACCION_PAUSAR, ACCION_SEGUIR, esAvisoDeCarrera, ID_NOTIFICACION_CARRERA } from '../utils/avisoDeCarrera';

/**
 * La notificación ÚNICA de la carrera (FR-011): km, tiempo y ritmo, con «Pausar» (o «Seguir» en pausa) y «Abrir».
 *
 * Es la del servicio en primer plano del GPS: `scripts/arreglar-notificacion-de-carrera.js` hace que `expo-notifications` publique
 * esta con el mismo id que la de `expo-location` y sin tag, así Android la toma como la del servicio (fija) y nunca hay dos. Hasta
 * la primera publicación se ve la del servicio («Carrera en curso»). Se actualiza como mucho cada 10 s (salvo al cambiar de fase),
 * en un canal silencioso y sin volver a sonar. Sus botones abren la app («Pausar» y «Seguir» además lo hacen): una acción que corra
 * sin abrir la app pediría un módulo nativo.
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
    await N.setNotificationCategoryAsync(CATEGORIA_CARRERA_EN_PAUSA, [
      { identifier: ACCION_SEGUIR, buttonTitle: TEXTOS_DE_LA_NOTIFICACION.seguir, options: { opensAppToForeground: true } },
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
  datos: DatosDeLaNotificacion,
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
        ...contenidoDeLaNotificacion(datos, formatoDuracion(datos.activoMs)),
        sticky: true,
        autoDismiss: false,
        sound: false,
        data: { carrera: true },
      },
      trigger: { channelId: CANAL_CARRERA } as never,
    });
  } catch {
    // Sin permiso de avisos: la carrera sigue; queda la notificación del servicio del GPS (la única).
  }
}

/**
 * La quita al terminar o descartar (después de detener el GPS: con el servicio vivo Android no deja quitarla). Se repite medio
 * segundo después por si una actualización que ya estaba en camino la volvió a publicar: sin servicio quedaría fija para siempre.
 */
export async function quitarNotificacionDeCarrera(esperarMs = 500): Promise<void> {
  ultimaMs = 0;
  const N = cargarNotificaciones();
  const quitar = async () => {
    try {
      await N?.dismissNotificationAsync(ID_NOTIFICACION_CARRERA);
    } catch {
      // Nada que quitar.
    }
  };
  await quitar();
  if (esperarMs > 0) {
    await new Promise(listo => setTimeout(listo, esperarMs));
    await quitar();
  }
}
