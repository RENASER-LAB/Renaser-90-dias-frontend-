import {
  asegurarCanal,
  cargarNotificaciones,
  pedirPermiso,
} from '../habits/notificaciones/recordatoriosDeHabito';
import { canalDeAlarma, type SonidoDeAlarma } from './sonidoDeAlarma';

/**
 * «Probar»: un aviso de prueba en 3 segundos, por el mismo canal que va a usar la alarma de verdad.
 * Para elegir un sonido hay que poder oírlo; y así la persona comprueba también que el permiso está
 * dado. Devuelve `false` si no se pudo (sin permiso, web, Expo Go).
 */
export async function probarSonido(sonido: SonidoDeAlarma): Promise<boolean> {
  const N = cargarNotificaciones();
  if (!N) return false;
  try {
    if (!(await pedirPermiso())) return false;
    // Por el canal de hábitos (2026-09-26): con «Voz» se oye «Tu hábito está por empezar», que es lo
    // que describe la opción. Antes era el de eventos; el sonido es el mismo en los dos.
    const canal = canalDeAlarma('habitos', sonido);
    await asegurarCanal(canal);
    await N.scheduleNotificationAsync({
      content: { title: 'Así suena tu alarma', body: 'Esta es una prueba de Renaser.', sound: canal.sonidoDelAviso },
      trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: canal.id },
    });
    return true;
  } catch {
    return false;
  }
}
