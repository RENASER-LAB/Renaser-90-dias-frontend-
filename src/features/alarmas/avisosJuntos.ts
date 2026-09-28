// SOLO tipos: cargar `expo-notifications` de verdad rompe Expo Go (ver `recordatoriosDeHabito.ts`).
import type * as TipoNotificaciones from 'expo-notifications';

import { planDeRearmado, type AlarmaProgramada, type PedidoDeRearmado } from './rearmarAlarmas';
import { canalDeAlarma, type CanalDeAlarma, type SonidoDeAlarma, type TipoDeAlarma } from './sonidoDeAlarma';

/**
 * Varios avisos a la misma hora: suena UNO que los nombra a todos (E-410, pedido del dueño del 28/09:
 * «si programa todos a esa hora, ¿cómo sería?»).
 *
 * ## El bug
 *
 * Cada hábito y cada acción con hora tiene su propia alarma. Con cuatro a las 12:00, Android las
 * entrega juntas y deja sonar solo la primera: a las demás las calla (`NotifAttentionHelper: Muting
 * recently noisy`, un sonido por segundo por app). Con «Voz», la persona oía «Agua tibia» y nada de
 * «Jugo verde», «Primera comida» ni «Última comida», aunque las cuatro quedaban en la bandeja. No se
 * pisan: se pierden. Y cuál suena lo decide el sistema, no la app.
 *
 * ## El arreglo
 *
 * Separarlas unos segundos no se puede: el disparador diario de `expo-notifications` solo lleva hora y
 * minuto. Entonces, en cada grupo que coincide (misma hora diaria, o mismo instante de fecha):
 *
 * - Una de ellas **lleva el aviso**: título «4 hábitos a las 12:00», los nombres en el cuerpo, y el
 *   sonido elegido (con «Voz», la frase genérica: la voz de un hábito solo sabe decir su nombre).
 * - Las demás siguen en la bandeja con su texto, **por un canal sin sonido**: un aviso sin sonido no
 *   gasta el límite de Android, así que el que suena es siempre el que nombra a todos.
 * - Una que queda sola vuelve a su texto y a su canal de siempre.
 *
 * El texto original se guarda en `data.avisoOriginal` para poder volver. Se aplica al abrir la app, al
 * cambiar el sonido y cada vez que se programa o cancela un hábito o una acción.
 *
 * Solo junta avisos del mismo tipo de disparador: una acción del martes a las 12:00 (de fecha) y un
 * hábito diario de las 12:00 no se juntan (los dos suenan por su lado y Android calla al segundo).
 */

export const CANAL_EN_SILENCIO: CanalDeAlarma = {
  id: 'avisos-juntos-sin-sonido',
  nombre: 'Avisos a la misma hora (sin sonido)',
  sonidoDelCanal: null,
  sonidoDelAviso: false,
};

export interface MiembroDeAviso {
  tipo: Extract<TipoDeAlarma, 'habitos' | 'objetivos'>;
  /** El canal que le toca cuando suena sola: su sonido y, con «Voz», su propia voz. */
  canalNormal: CanalDeAlarma;
}

interface TextoDelAviso {
  title: string | null;
  body: string | null;
}

type Datos = Record<string, unknown>;

function textoOriginal(content: TipoNotificaciones.NotificationContentInput): TextoDelAviso {
  const guardado = (content.data as Datos | undefined)?.avisoOriginal as Partial<TextoDelAviso> | undefined;
  if (guardado && typeof guardado === 'object') return { title: guardado.title ?? null, body: guardado.body ?? null };
  return { title: content.title ?? null, body: content.body ?? null };
}

const dosCifras = (n: number) => String(n).padStart(2, '0');

/** Qué avisos suenan juntos, y a qué hora (`HH:mm`). `null` si el disparador no se junta. */
function momentoDe(trigger: PedidoDeRearmado['trigger']): { clave: string; hora: string } | null {
  const t = trigger as Datos;
  if (t.type === 'daily' && typeof t.hour === 'number' && typeof t.minute === 'number') {
    return { clave: `diaria-${t.hour}:${t.minute}`, hora: `${dosCifras(t.hour)}:${dosCifras(t.minute)}` };
  }
  if (t.type === 'weekly' && typeof t.hour === 'number' && typeof t.minute === 'number') {
    return { clave: `semanal-${t.weekday}-${t.hour}:${t.minute}`, hora: `${dosCifras(t.hour)}:${dosCifras(t.minute)}` };
  }
  if (t.type === 'date' && typeof t.date === 'number') {
    const d = new Date(t.date);
    return { clave: `fecha-${t.date}`, hora: `${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}` };
  }
  return null;
}

const MAXIMO_DE_NOMBRES = 4;

/** Pura: el texto del aviso que lleva al grupo. */
export function textoDelGrupo(tipos: ReadonlyArray<MiembroDeAviso['tipo']>, nombres: string[], hora: string): TextoDelAviso {
  const n = nombres.length;
  const que = tipos.every(t => t === 'habitos') ? 'hábitos' : tipos.every(t => t === 'objetivos') ? 'acciones' : 'avisos';
  const visibles = nombres.slice(0, MAXIMO_DE_NOMBRES).join(' · ');
  const resto = n > MAXIMO_DE_NOMBRES ? ` y ${n - MAXIMO_DE_NOMBRES} más` : '';
  return { title: `${n} ${que} a las ${hora}`, body: `${visibles}${resto}` };
}

/** El canal del aviso que lleva al grupo: el sonido elegido; con «Voz», la frase genérica del tipo. */
export function canalDelGrupo(tipos: ReadonlyArray<MiembroDeAviso['tipo']>, sonido: SonidoDeAlarma): CanalDeAlarma {
  return canalDeAlarma(tipos.every(t => t === 'objetivos') ? 'objetivos' : 'habitos', sonido);
}

function conTexto(
  content: TipoNotificaciones.NotificationContentInput,
  texto: TextoDelAviso,
  canal: CanalDeAlarma,
  guardarOriginal: TextoDelAviso | null,
): TipoNotificaciones.NotificationContentInput {
  const { avisoOriginal: _viejo, ...datos } = (content.data as Datos | undefined) ?? {};
  const data = guardarOriginal ? { ...datos, avisoOriginal: guardarOriginal } : datos;
  return { ...content, title: texto.title, body: texto.body, sound: canal.sonidoDelAviso, data };
}

function igual(pedido: PedidoDeRearmado, content: TipoNotificaciones.NotificationContentInput, canal: CanalDeAlarma): boolean {
  const original = (pedido.content.data as Datos | undefined)?.avisoOriginal;
  const deseado = (content.data as Datos | undefined)?.avisoOriginal;
  return (pedido.trigger as Datos).channelId === canal.id
    && pedido.content.title === content.title
    && pedido.content.body === content.body
    && JSON.stringify(original ?? null) === JSON.stringify(deseado ?? null);
}

/**
 * Pura: qué avisos hay que reprogramar (mismo id, mismo disparador) para que cada grupo que coincide
 * suene una sola vez y nombre a todos. Idempotente: con todo al día, no pide nada.
 */
export function planDeAvisosJuntos(
  programadas: AlarmaProgramada[],
  miembros: ReadonlyMap<string, MiembroDeAviso>,
  sonido: SonidoDeAlarma,
  ahoraMs: number,
): { pedidos: PedidoDeRearmado[]; canales: CanalDeAlarma[] } {
  const propias = programadas.filter(p => miembros.has(p?.identifier));
  // Margen 0, como el cambio de sonido: una diaria recién vencida también se ordena.
  const grupos = new Map<string, { hora: string; pedidos: PedidoDeRearmado[] }>();
  for (const pedido of planDeRearmado(propias, ahoraMs, 0)) {
    const momento = momentoDe(pedido.trigger);
    if (!momento) continue;
    const grupo = grupos.get(momento.clave) ?? { hora: momento.hora, pedidos: [] };
    grupo.pedidos.push(pedido);
    grupos.set(momento.clave, grupo);
  }

  const pedidos: PedidoDeRearmado[] = [];
  const canales = new Map<string, CanalDeAlarma>();
  const pedir = (pedido: PedidoDeRearmado, content: TipoNotificaciones.NotificationContentInput, canal: CanalDeAlarma) => {
    canales.set(canal.id, canal);
    if (igual(pedido, content, canal)) return;
    pedidos.push({ identifier: pedido.identifier, content, trigger: { ...pedido.trigger, channelId: canal.id } as PedidoDeRearmado['trigger'] });
  };

  for (const { hora, pedidos: delGrupo } of grupos.values()) {
    const orden = [...delGrupo].sort((a, b) => a.identifier.localeCompare(b.identifier));
    if (orden.length === 1) {
      const [solo] = orden;
      const canal = miembros.get(solo.identifier)!.canalNormal;
      pedir(solo, conTexto(solo.content, textoOriginal(solo.content), canal, null), canal);
      continue;
    }
    const tipos = orden.map(p => miembros.get(p.identifier)!.tipo);
    const originales = orden.map(p => textoOriginal(p.content));
    const [lleva, ...resto] = orden;
    const canal = canalDelGrupo(tipos, sonido);
    const texto = textoDelGrupo(tipos, originales.map(o => o.title ?? ''), hora);
    pedir(lleva, conTexto(lleva.content, texto, canal, originales[0]), canal);
    resto.forEach((p, i) => pedir(p, conTexto(p.content, originales[i + 1], CANAL_EN_SILENCIO, null), CANAL_EN_SILENCIO));
  }
  return { pedidos, canales: [...canales.values()] };
}

/* ------------------------------------------------------------------------------------------------
 * Aplicarlo en el teléfono
 * ---------------------------------------------------------------------------------------------- */

let cola: Promise<unknown> = Promise.resolve();

/**
 * Ordena los avisos de hábitos y de acciones de esta persona que coinciden. Devuelve cuántos
 * reprogramó. En web y Expo Go no hace nada. Una corrida por vez (se encolan).
 *
 * Los módulos de hábitos y de objetivos se cargan acá adentro, no arriba: ellos llaman a esta función
 * después de programar o cancelar, y un import de ida y vuelta dejaría uno de los dos sin cargar.
 */
export function agruparAvisosQueCoinciden(userId: string, ahoraMs: number = Date.now()): Promise<number> {
  const turno = cola.then(() => agruparAhora(userId, ahoraMs), () => agruparAhora(userId, ahoraMs));
  cola = turno.catch(() => undefined);
  return turno;
}

async function agruparAhora(userId: string, ahoraMs: number): Promise<number> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const habitos = require('../habits/notificaciones/recordatoriosDeHabito') as typeof import('../habits/notificaciones/recordatoriosDeHabito');
  const acciones = require('../objetivos/notificaciones/recordatoriosDeAcciones') as typeof import('../objetivos/notificaciones/recordatoriosDeAcciones');
  const { preferenciasDeAlarmas } = require('./preferenciasDeAlarmas') as typeof import('./preferenciasDeAlarmas');
  /* eslint-enable @typescript-eslint/no-require-imports */
  if (!habitos.HAY_RECORDATORIOS_LOCALES) return 0;
  const N = habitos.cargarNotificaciones();
  if (!N) return 0;
  try {
    const programadas = (await N.getAllScheduledNotificationsAsync()) as AlarmaProgramada[];
    if (!Array.isArray(programadas) || programadas.length < 2) return 0;
    const porId = new Map(programadas.map(p => [p?.identifier, p]));
    const sonido = (await preferenciasDeAlarmas(userId)).sonido;
    const miembros = new Map<string, MiembroDeAviso>();
    for (const [habitoId, ids] of await habitos.recordatoriosPorHabito(userId)) {
      const sonidoDelHabito = await habitos.sonidoDe(userId, habitoId);
      for (const id of ids) {
        const alarma = porId.get(id);
        if (!alarma) continue;
        const original = (alarma.content?.data as Datos | undefined)?.avisoOriginal as TextoDelAviso | undefined;
        const titulo = habitos.habitoDelAviso(original?.title ?? alarma.content?.title ?? '');
        miembros.set(id, { tipo: 'habitos', canalNormal: canalDeAlarma('habitos', sonidoDelHabito, { id: habitoId, titulo }) });
      }
    }
    for (const id of await acciones.idsDeRecordatoriosDeAcciones(userId)) {
      if (porId.has(id)) miembros.set(id, { tipo: 'objetivos', canalNormal: canalDeAlarma('objetivos', sonido) });
    }
    const { pedidos, canales } = planDeAvisosJuntos(programadas, miembros, sonido, ahoraMs);
    if (pedidos.length === 0) return 0;
    for (const canal of canales) {
      if (canal.id === CANAL_EN_SILENCIO.id) {
        // Importancia normal y sin sonido: aparece en la bandeja sin saltar encima de la pantalla.
        await N.setNotificationChannelAsync(canal.id, {
          name: canal.nombre,
          importance: N.AndroidImportance.DEFAULT,
          sound: null,
          enableVibrate: false,
        });
      } else {
        await habitos.asegurarCanal(canal);
      }
    }
    let hechos = 0;
    for (const pedido of pedidos) {
      try {
        await N.scheduleNotificationAsync(pedido);
        hechos++;
      } catch {
        // Una que falla conserva su canal: en el peor caso suena sola, como antes.
      }
    }
    return hechos;
  } catch {
    return 0;
  }
}
