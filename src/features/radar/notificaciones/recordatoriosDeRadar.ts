import { Platform } from 'react-native';

import {
  HAY_RECORDATORIOS_LOCALES,
  cargarNotificaciones,
  pedirPermiso,
} from '../../habits/notificaciones/recordatoriosDeHabito';
import { CONFIG_RADAR } from '../config/configRadar';
import { horaEnPunto, horasConSlot } from '../utils/slotsDelRadar';

/**
 * Los avisos por hora del Código Renaser, en el teléfono.
 *
 * ## Por qué hacen falta
 *
 * Sin esto el formulario sólo aparece si la persona abre la app justo dentro de esa hora. Con doce
 * franjas al día y alguien que entra tres veces, se pierden nueve — y como los slots que pasan no
 * se acumulan (a propósito), se pierden de verdad. El "sí o sí" del aprendiz no se sostiene si
 * nadie le avisa.
 *
 * ## Doce alarmas DIARIAS, no ochenta y cuatro sueltas
 *
 * Doce franjas × siete días son 84 avisos, y **iOS sólo admite 64 pendientes por app**: programar
 * uno por franja y día haría que el sistema descartara en silencio los últimos días, justo los que
 * más cuesta sostener. Con un disparador `DAILY` por hora quedan doce pendientes, muy por debajo
 * del tope, y el sistema los repite solo.
 *
 * La contrapartida es que un disparador diario no sabe en qué día de programa está nadie: seguiría
 * sonando el día 8. Por eso {@link sincronizarRecordatoriosDeRadar} los CANCELA en cuanto el día
 * sale de la ventana; se llama desde `RadarProvider` cada vez que se conoce el día de programa,
 * que es al entrar y al cambiar la fecha.
 *
 * ## Silencio en web y en Expo Go
 *
 * Mismo límite que los recordatorios de hábitos, y por la misma razón: `HAY_RECORDATORIOS_LOCALES`.
 * Ahí estas funciones no hacen nada y no fingen que sí.
 */

const CANAL_ANDROID = 'recordatorios-codigo-renaser';

/**
 * Minuto de la hora en que suena el aviso.
 *
 * No en el minuto 0: ahí la franja recién abre y el formulario todavía está en su cortesía
 * (`minutosDeCortesia`). Avisar exactamente en punto mandaría a la persona a una pantalla que
 * todavía no le va a pedir nada.
 */
const MINUTO_DEL_AVISO = 2;

/** Ninguna operación de notificaciones puede tumbar la app. */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

/** El canal de Android tiene que existir antes de programar contra él. Idempotente. */
async function asegurarCanal(): Promise<void> {
  const N = cargarNotificaciones();
  if (!N || Platform.OS !== 'android') return;
  // Sin `sound`: en un canal de Android ese campo es el NOMBRE DE ARCHIVO de un sonido propio.
  // Omitirlo es lo que deja el sonido del sistema (mismo motivo que en hábitos).
  await N.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Código Renaser',
    importance: N.AndroidImportance.HIGH,
  });
}

/**
 * Identificador estable por franja. Al ser el mismo en cada corrida, reprogramar no duplica:
 * primero se cancela por este id y después se vuelve a crear.
 */
function identificador(hora: number): string {
  return `renaser.radar.slot.${String(hora).padStart(2, '0')}`;
}

/** Quita las doce alarmas. Idempotente: cancelar una que no existe no es un error. */
export async function cancelarRecordatoriosDeRadar(): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  await sinRomper(async () => {
    for (const hora of horasConSlot()) {
      await N.cancelScheduledNotificationAsync(identificador(hora));
    }
  }, undefined);
}

/**
 * Programa las doce alarmas diarias. Devuelve `false` si no se pudo (sin permiso, web, Expo Go),
 * y en ese caso NO deja nada a medias.
 */
export async function programarRecordatoriosDeRadar(): Promise<boolean> {
  const N = cargarNotificaciones();
  if (!N) return false;
  if (!(await pedirPermiso())) return false;

  return sinRomper(async () => {
    await asegurarCanal();
    // Se cancela antes de programar: sin esto, cada arranque de la app sumaría doce alarmas más.
    await cancelarRecordatoriosDeRadar();
    for (const hora of horasConSlot()) {
      await N.scheduleNotificationAsync({
        identifier: identificador(hora),
        content: {
          title: `Código Renaser · ${horaEnPunto(hora)}`,
          body: '¿Dónde estás ahora mismo? Cinco preguntas, un minuto.',
          ...(Platform.OS === 'android' ? { channelId: CANAL_ANDROID } : {}),
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DAILY,
          hour: hora,
          minute: MINUTO_DEL_AVISO,
        },
      });
    }
    return true;
  }, false);
}

/**
 * Deja las alarmas como corresponda al día de programa: puestas dentro de la ventana, quitadas
 * fuera de ella.
 *
 * Es la única función que deberían llamar las pantallas. Que cancelar sea parte de esto —y no una
 * decisión de quien llama— es lo que impide que a alguien le siga sonando el aviso el día 8, que
 * es el fallo más probable de un disparador que se repite solo.
 */
export async function sincronizarRecordatoriosDeRadar(diaPrograma: number | null): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const dentroDeLaVentana =
    CONFIG_RADAR.activo &&
    diaPrograma !== null &&
    diaPrograma >= CONFIG_RADAR.primerDia &&
    diaPrograma <= CONFIG_RADAR.ultimoDia;
  if (dentroDeLaVentana) {
    await programarRecordatoriosDeRadar();
  } else {
    await cancelarRecordatoriosDeRadar();
  }
}
