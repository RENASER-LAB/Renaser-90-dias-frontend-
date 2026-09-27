import {
  asegurarCanal,
  cargarNotificaciones,
  pedirPermiso,
} from '../habits/notificaciones/recordatoriosDeHabito';
import { canalDeAlarma, SONIDOS, type SonidoDeAlarma } from './sonidoDeAlarma';
import { HABITO_DE_MUESTRA } from './vozDeLosHabitos';

/**
 * Oír un sonido por el MISMO canal que va a usar la alarma de verdad: lo que se oye es lo que va a
 * sonar (volumen de avisos, modo silencio incluido), y de paso la persona comprueba que el permiso
 * está dado. Devuelve `false` si no se pudo (sin permiso, web, Expo Go).
 *
 * - `probarSonido`: el botón «Probar el sonido» (el elegido), un aviso de prueba en 3 segundos.
 * - `escucharSonido` (2026-09-27): el «Escuchar» de cada opción, para oírla ANTES de elegirla. Sale
 *   al instante (`trigger: { channelId }`: no pasa por una alarma, así que no depende del permiso de
 *   alarmas exactas) y sin cambiar lo elegido.
 *
 * Los dos usan el mismo identificador: una prueba nueva reemplaza a la anterior en vez de apilar
 * avisos. Con «Voz» suena la de Despertar, que dice su nombre: así suena cada hábito del catálogo.
 */

const ID_DE_LA_PRUEBA = 'renaser-prueba-de-sonido';

function textoDeLaPrueba(sonido: SonidoDeAlarma): { title: string; body: string } {
  if (sonido === 'voz') {
    return { title: 'Así suena tu alarma', body: 'Con «Voz», cada hábito dice su nombre. Este es Despertar.' };
  }
  const nombre = SONIDOS.find(s => s.clave === sonido)?.nombre ?? '';
  return { title: 'Así suena tu alarma', body: `${nombre}. Esta es una prueba de Renaser.` };
}

async function sonarPrueba(sonido: SonidoDeAlarma, enSegundos: number | null): Promise<boolean> {
  const N = cargarNotificaciones();
  if (!N) return false;
  try {
    if (!(await pedirPermiso())) return false;
    // Por el canal de hábitos: con «Voz», la del hábito de muestra.
    const canal = canalDeAlarma('habitos', sonido, HABITO_DE_MUESTRA);
    await asegurarCanal(canal);
    await N.scheduleNotificationAsync({
      identifier: ID_DE_LA_PRUEBA,
      content: { ...textoDeLaPrueba(sonido), sound: canal.sonidoDelAviso },
      trigger: enSegundos === null
        ? { channelId: canal.id }
        : { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: enSegundos, channelId: canal.id },
    });
    return true;
  } catch {
    return false;
  }
}

/** «Probar el sonido»: el elegido, en 3 segundos. */
export async function probarSonido(sonido: SonidoDeAlarma): Promise<boolean> {
  return sonarPrueba(sonido, 3);
}

/** «Escuchar»: una opción cualquiera, ya, sin elegirla. */
export async function escucharSonido(sonido: SonidoDeAlarma): Promise<boolean> {
  return sonarPrueba(sonido, null);
}
