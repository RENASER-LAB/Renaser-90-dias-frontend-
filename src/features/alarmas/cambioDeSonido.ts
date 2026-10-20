import {
  asegurarCanal,
  cargarNotificaciones,
  fijarSonido,
  habitoDelAviso,
  recordatoriosPorHabito,
  sonidoDe,
} from '../habits/notificaciones/recordatoriosDeHabito';
import { idsDeRecordatoriosDeAcciones } from '../objetivos/notificaciones/recordatoriosDeAcciones';
import { agruparAvisosQueCoinciden } from './avisosJuntos';
import { planDeRearmado, type AlarmaProgramada, type PedidoDeRearmado } from './rearmarAlarmas';
import {
  canalDeAlarma,
  SUFIJO_CON_VIBRACION,
  SUFIJO_SIN_VIBRACION,
  type CanalDeAlarma,
  type SonidoDeAlarma,
} from './sonidoDeAlarma';
import {
  canalDeLaCombinacion,
  combinacionGuardada,
  COMBINACION_POR_DEFECTO,
} from '../habits/notificaciones/utils/combinacionDeAlarma';

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
  sonido: SonidoDeAlarma | ((habitoId: string | undefined) => SonidoDeAlarma),
): (alarma: AlarmaProgramada) => CanalDeAlarma {
  return alarma => {
    const habitoId = habitoDeLaAlarma.get(alarma.identifier);
    // Un aviso que lleva a un grupo guarda el texto original en `data.avisoOriginal`: de ahí sale el nombre del hábito.
    const datos = alarma.content?.data as Record<string, unknown> | null | undefined;
    const original = datos?.avisoOriginal as { title?: string | null } | undefined;
    const titulo = habitoDelAviso(original?.title ?? alarma.content?.title ?? '');
    const habito = habitoId ? { id: habitoId, titulo } : undefined;
    // Spec 009: cómo suena la alarma (sin vibración, solo vibrar, voz) viaja en el aviso: el sonido nuevo de Yo →
    // Alarmas cambia el tono, no si vibra o habla. E-641: sin combinación propia es la de siempre (sonido y
    // vibración), que sale por el canal `-vib`: los canales base de hábitos no vibran.
    const combinacion = combinacionGuardada(datos?.alarma) ?? COMBINACION_POR_DEFECTO;
    const tono = typeof sonido === 'function' ? sonido(habitoId) : sonido;
    return canalDeLaCombinacion('habitos', tono, combinacion, habito);
  };
}

/**
 * Los canales base de hábitos —los de antes de E-641— no vibran. Toda alarma de hábito sale ahora por un canal `-vib` o
 * `-sinvib` (vibración dicha de forma explícita); este es el que ya no corresponde. `avisos-juntos-sin-sonido` no es
 * de acá: lo ordena `avisosJuntos`.
 */
export function esCanalAnteriorDeHabitos(canalId: unknown): boolean {
  return typeof canalId === 'string'
    && canalId.startsWith('recordatorios-habitos')
    && !canalId.endsWith(SUFIJO_CON_VIBRACION)
    && !canalId.endsWith(SUFIJO_SIN_VIBRACION);
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

/**
 * E-641 (decisión del dueño: vibrar por defecto): pasa al canal que vibra (`-vib`, o `-sinvib` si la combinación del
 * día lo pide) las alarmas de hábitos que siguen en un canal base de antes, que no vibra. Cada una conserva su
 * identificador, su hora y su texto: es el mismo pedido con otro canal, como el cambio de sonido. Alcanza a los
 * recordatorios de cada hábito y a sus repeticiones. El tono de cada hábito es el suyo (`sonidoDe`: el de Yo → Alarmas
 * o el que se le fijó, como Despertar).
 *
 * Idempotente y barata: con todo ya migrado, es una lectura de lo programado y nada más. Corre en cada puesta al día
 * (`ponerAlDiaLasAlarmas`), antes de ordenar los avisos que coinciden. Devuelve cuántas pasó.
 */
export async function ponerLasAlarmasDeHabitosEnSuCanal(userId: string, ahoraMs: number = Date.now()): Promise<number> {
  const N = cargarNotificaciones();
  if (!N) return 0;
  try {
    const programadas = (await N.getAllScheduledNotificationsAsync()) as AlarmaProgramada[];
    const anteriores = programadas.filter(p => esCanalAnteriorDeHabitos((p?.trigger as { channelId?: unknown } | null)?.channelId));
    if (anteriores.length === 0) return 0;
    const habitoDeLaAlarma = new Map<string, string>();
    for (const [habitoId, ids] of await recordatoriosPorHabito(userId)) {
      for (const id of ids) habitoDeLaAlarma.set(id, habitoId);
    }
    try {
      // Se carga acá adentro: ese módulo importa al de hábitos, igual que este.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { repeticionesProgramadas } = require('../habits/notificaciones/repeticiones') as typeof import('../habits/notificaciones/repeticiones');
      for (const [id, habitoId] of await repeticionesProgramadas()) habitoDeLaAlarma.set(id, habitoId);
    } catch {
      // Sin repeticiones que pasar, lo demás sigue igual.
    }
    const ids = anteriores.map(p => p.identifier).filter(id => habitoDeLaAlarma.has(id));
    if (ids.length === 0) return 0;
    const tonos = new Map<string, SonidoDeAlarma>();
    for (const habitoId of new Set(ids.map(id => habitoDeLaAlarma.get(id) as string))) {
      tonos.set(habitoId, await sonidoDe(userId, habitoId));
    }
    return await cambiarSonidoDeLasProgramadas(
      ids,
      canalDelHabitoProgramado(habitoDeLaAlarma, habitoId => (habitoId && tonos.get(habitoId)) || 'sistema'),
      ahoraMs,
    );
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
  // Spec 009: las repeticiones («Repetir si no la atiendo») no están entre los ids guardados del hábito, pero también
  // suenan con el tono elegido. Se cargan acá adentro: ese módulo importa al de hábitos, igual que este.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { repeticionesProgramadas } = require('../habits/notificaciones/repeticiones') as typeof import('../habits/notificaciones/repeticiones');
    for (const [id, habitoId] of await repeticionesProgramadas()) habitoDeLaAlarma.set(id, habitoId);
  } catch {
    // Sin repeticiones que pasar, el resto del cambio de sonido sigue igual.
  }
  return cambiarSonidoDeLasProgramadas(
    [...habitoDeLaAlarma.keys()],
    canalDelHabitoProgramado(habitoDeLaAlarma, sonido),
    ahoraMs,
  );
}

/** El hábito de Despertar tal como lo muestra Yo → Alarmas. */
export interface DespertarDeYo {
  habitoId: string;
  titulo: string;
  hora: string;
  alarmaPuesta: boolean;
}

/**
 * Yo → Alarmas → Sonido: pasa al sonido nuevo TODO lo que ya está programado —hábitos, Despertar y
 * acciones de los objetivos— y vuelve a juntar los avisos que coinciden (E-410). No toca horas.
 */
export async function pasarAlarmasAlSonido(
  userId: string,
  sonido: SonidoDeAlarma,
  despertar: DespertarDeYo | null,
  ahoraMs: number = Date.now(),
): Promise<void> {
  // Despertar guarda su sonido (lo respeta todo `programar` posterior) y se pasa con los demás hábitos.
  //
  // > **Corregido 2026-09-28 (E-412).** Se reprogramaba aparte con `despertar.hora`, la hora de HOY, y
  // > eso borraba un cambio de hora con fecha (D-217): con «12:00 desde mañana», elegir otro sonido lo
  // > dejaba en «06:00 todos los días». `cambiarSonidoDeLosHabitos` conserva cada disparador tal cual.
  if (despertar) await fijarSonido(userId, despertar.habitoId, sonido);
  await cambiarSonidoDeLosHabitos(userId, sonido, ahoraMs);
  await cambiarSonidoDeLasProgramadas(await idsDeRecordatoriosDeAcciones(userId), canalDeAlarma('objetivos', sonido), ahoraMs);
  await agruparAvisosQueCoinciden(userId, ahoraMs);
}
