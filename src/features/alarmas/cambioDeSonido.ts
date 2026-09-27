import { asegurarCanal, cargarNotificaciones } from '../habits/notificaciones/recordatoriosDeHabito';
import { planDeRearmado, type AlarmaProgramada, type PedidoDeRearmado } from './rearmarAlarmas';
import type { CanalDeAlarma } from './sonidoDeAlarma';

/**
 * Pasa al sonido nuevo las alarmas ya programadas que se le indiquen, sin tocar su hora ni su texto
 * (2026-09-26, al sumar la voz).
 *
 * En Android el sonido es del canal, y el canal de una alarma se fija al programarla. Hasta ahora,
 * cambiar el sonido en Yo → Alarmas reprogramaba Despertar y los eventos, que saben rehacerse solos
 * (tienen su hora y su lista a mano). Los recordatorios del resto de los hábitos y los de las acciones
 * de los objetivos no: su hora está en el servidor o en la lista del día. Pero el teléfono ya tiene
 * todo lo necesario —identificador, contenido y disparador—, así que se vuelven a programar tal cual,
 * con el mismo identificador (la librería reemplaza, no duplica: ver `rearmarAlarmas.ts`) y el canal
 * del sonido nuevo. Los ids guardados siguen sirviendo para cancelarlas.
 */

/** Pura: qué pedidos hacen falta para que las alarmas `ids` salgan por `canal`. */
export function planDeCambioDeSonido(
  programadas: AlarmaProgramada[],
  ids: ReadonlySet<string>,
  canal: CanalDeAlarma,
  ahoraMs: number,
): PedidoDeRearmado[] {
  const propias = programadas.filter(p => ids.has(p?.identifier));
  // Margen 0: una diaria recién vencida también se pasa. Si se la saltara, quedaría con el sonido
  // viejo todos los días, no solo hoy.
  return planDeRearmado(propias, ahoraMs, 0)
    .filter(p => (p.trigger as { channelId?: string }).channelId !== canal.id)
    .map(p => ({
      identifier: p.identifier,
      content: { ...p.content, sound: canal.sonidoDelAviso },
      trigger: { ...p.trigger, channelId: canal.id } as PedidoDeRearmado['trigger'],
    }));
}

/** Devuelve cuántas pasó al canal nuevo. En web y Expo Go no hace nada. */
export async function cambiarSonidoDeLasProgramadas(
  ids: string[],
  canal: CanalDeAlarma,
  ahoraMs: number = Date.now(),
): Promise<number> {
  const N = cargarNotificaciones();
  if (!N || ids.length === 0) return 0;
  try {
    await asegurarCanal(canal);
    const plan = planDeCambioDeSonido(
      (await N.getAllScheduledNotificationsAsync()) as AlarmaProgramada[],
      new Set(ids),
      canal,
      ahoraMs,
    );
    let cambiadas = 0;
    for (const pedido of plan) {
      try {
        await N.scheduleNotificationAsync(pedido);
        cambiadas++;
      } catch {
        // Una que falla no impide las demás: se queda con el sonido anterior.
      }
    }
    return cambiadas;
  } catch {
    return 0;
  }
}
