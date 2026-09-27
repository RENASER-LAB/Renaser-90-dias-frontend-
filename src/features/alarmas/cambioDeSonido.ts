import {
  asegurarCanal,
  cargarNotificaciones,
  habitoDelAviso,
  recordatoriosPorHabito,
} from '../habits/notificaciones/recordatoriosDeHabito';
import { planDeRearmado, type AlarmaProgramada, type PedidoDeRearmado } from './rearmarAlarmas';
import { canalDeAlarma, type CanalDeAlarma, type SonidoDeAlarma } from './sonidoDeAlarma';

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
 *
 * Desde 2026-09-27 la «Voz» de un hábito del catálogo dice su nombre y sale por su propio canal: el
 * canal ya no es uno para todas, sino uno por alarma (`CanalPara`). El hábito de cada alarma sale del
 * id guardado (`recordatoriosPorHabito`) y su nombre, del título del aviso (`habitoDelAviso`).
 */

/** Un canal para todas, o el canal de cada alarma. */
export type CanalPara = CanalDeAlarma | ((alarma: AlarmaProgramada) => CanalDeAlarma);

function comoFuncion(canal: CanalPara): (alarma: AlarmaProgramada) => CanalDeAlarma {
  return typeof canal === 'function' ? canal : () => canal;
}

/** Pura: qué pedidos hacen falta para que las alarmas `ids` salgan por su canal. */
export function planDeCambioDeSonido(
  programadas: AlarmaProgramada[],
  ids: ReadonlySet<string>,
  canal: CanalPara,
  ahoraMs: number,
): PedidoDeRearmado[] {
  const canalDe = comoFuncion(canal);
  const propias = programadas.filter(p => ids.has(p?.identifier));
  const canalPorId = new Map(propias.map(p => [p.identifier, canalDe(p)]));
  // Margen 0: una diaria recién vencida también se pasa. Si se la saltara, quedaría con el sonido
  // viejo todos los días, no solo hoy.
  return planDeRearmado(propias, ahoraMs, 0).flatMap(p => {
    const nuevo = canalPorId.get(p.identifier);
    if (!nuevo || (p.trigger as { channelId?: string }).channelId === nuevo.id) return [];
    return [{
      identifier: p.identifier,
      content: { ...p.content, sound: nuevo.sonidoDelAviso },
      trigger: { ...p.trigger, channelId: nuevo.id } as PedidoDeRearmado['trigger'],
    }];
  });
}

/**
 * Pura: el canal de una alarma de hábito ya programada. El hábito sale de su id guardado; su nombre,
 * del título del aviso. Sin hábito conocido, la frase genérica (lo mismo que un hábito propio).
 */
export function canalDelHabitoProgramado(
  habitoDeLaAlarma: ReadonlyMap<string, string>,
  sonido: SonidoDeAlarma,
): (alarma: AlarmaProgramada) => CanalDeAlarma {
  return alarma => {
    const habitoId = habitoDeLaAlarma.get(alarma.identifier);
    const titulo = habitoDelAviso(alarma.content?.title ?? '');
    return canalDeAlarma('habitos', sonido, habitoId ? { id: habitoId, titulo } : undefined);
  };
}

/** Devuelve cuántas pasó a su canal nuevo. En web y Expo Go no hace nada. */
export async function cambiarSonidoDeLasProgramadas(
  ids: string[],
  canal: CanalPara,
  ahoraMs: number = Date.now(),
): Promise<number> {
  const N = cargarNotificaciones();
  if (!N || ids.length === 0) return 0;
  try {
    const programadas = (await N.getAllScheduledNotificationsAsync()) as AlarmaProgramada[];
    const propias = new Set(ids);
    const canalDe = comoFuncion(canal);
    // Cada canal tiene que existir antes de programar contra él (uno por sonido y, con «Voz», por hábito).
    const canales = new Map(programadas.filter(p => propias.has(p?.identifier)).map(p => {
      const c = canalDe(p);
      return [c.id, c] as const;
    }));
    for (const c of canales.values()) await asegurarCanal(c);
    let cambiadas = 0;
    for (const pedido of planDeCambioDeSonido(programadas, propias, canalDe, ahoraMs)) {
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

/** Los recordatorios de todos los hábitos de la persona: cada uno a su canal del sonido nuevo. */
export async function cambiarSonidoDeLosHabitos(
  userId: string,
  sonido: SonidoDeAlarma,
  ahoraMs: number = Date.now(),
): Promise<number> {
  const habitoDeLaAlarma = new Map<string, string>();
  for (const [habitoId, ids] of await recordatoriosPorHabito(userId)) {
    for (const id of ids) habitoDeLaAlarma.set(id, habitoId);
  }
  return cambiarSonidoDeLasProgramadas(
    [...habitoDeLaAlarma.keys()],
    canalDelHabitoProgramado(habitoDeLaAlarma, sonido),
    ahoraMs,
  );
}
