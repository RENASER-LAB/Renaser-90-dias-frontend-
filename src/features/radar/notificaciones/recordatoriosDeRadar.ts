import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { ahoraConfiable } from '../../../services/http/relojServidor';
import {
  HAY_RECORDATORIOS_LOCALES,
  cargarNotificaciones,
  pedirPermiso,
} from '../../habits/notificaciones/recordatoriosDeHabito';
import { weekdayDeExpo } from '../../habits/notificaciones/utils/alarmasPorDia';
import { CONFIG_RADAR, MI_RADAR } from '../config/configRadar';
import type { MiRadarApi } from '../types/radar.types';
import { DIAS_ISO, type AvisoDeRadar, type DiaIso, horasDeAviso, horasElegibles, miRadarCorresponde } from '../utils/miRadar';
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
 *
 * ## Mi Radar desde el día 8 (spec 012, 2026-10-29)
 *
 * Es el mismo mecanismo con otras horas. {@link horasDeAviso} decide cuáles suenan: los días 1 a 7, las doce de
 * siempre (de 08:00 a 19:00, **sin un solo cambio**); desde el día 8, las que la persona eligió en Yo → Mi Radar,
 * solo si lo tiene encendido. Los identificadores, el canal y el minuto son los de siempre, así que cambiar las horas
 * reprograma sin duplicar. Desde el día 8 el aviso lleva `data.route = '/mi-radar'`: tocarlo abre Mi Radar (la clave
 * es `route`, la que lee `rutaDeAviso`; el contrato de la spec la llama `url`).
 *
 * ## Por día de la semana (cuarta ronda, 2026-10-29)
 *
 * Con Mi Radar **sin ningún día distinto** (el caso común) todo sigue como arriba: una alarma DIARIA por hora, con el id
 * `renaser.radar.slot.HH`. Cuando algún día tiene horas propias o va sin Radar, el disparador diario ya no sirve (no sabe
 * qué día es) y pasa a **una alarma SEMANAL por día y por hora** de ese día, con el id estable `renaser.radar.slot.d{1..7}.HH`
 * (lunes = 1), igual que los hábitos con días distintos (spec 008). Un día sin Radar no tiene ninguna. {@link horasDeAviso}
 * decide el esquema y esto solo lo programa; **cancelar cubre los dos esquemas**, así que pasar de uno al otro (o apagar)
 * no deja alarmas viejas.
 *
 * **Tope de iOS: 64 avisos pendientes por app.** Con días distintos pueden ser hasta 84 (7 días × 12 horas). Hoy la app es solo
 * Android, que no tiene tope; si algún día sale en iOS hay que recortar en `horasDeAviso` antes de programar.
 *
 * Y la **invitación del día 8**: durante los días 1 a 7 el teléfono deja programado UN aviso para el día 8 a las 09:00
 * («Terminaste tu primera semana…»), una sola vez por cuenta. Sin servidor ni tabla. Si la persona enciende Mi Radar,
 * se cancela.
 */

const CANAL_ANDROID = 'recordatorios-codigo-renaser';

/** Lo que lleva `data.route` desde el día 8: tocar el aviso abre Yo → Mi Radar (`destinoDeRuta`). */
const RUTA_DE_MI_RADAR = '/mi-radar';

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
 *
 * Diario: `renaser.radar.slot.09`. Semanal (Mi Radar con días distintos): `renaser.radar.slot.d6.09` (sábado a las 09:00).
 */
function identificador(hora: number, dia: DiaIso | null = null): string {
  const hh = String(hora).padStart(2, '0');
  return dia === null ? `renaser.radar.slot.${hh}` : `renaser.radar.slot.d${dia}.${hh}`;
}

/** Todos los ids que Mi Radar y el Código Renaser pueden haber programado: los diarios de 03 a 23 y los semanales de cada día. */
function todosLosIdentificadores(): string[] {
  const horas = [...new Set([...horasConSlot(), ...horasElegibles()])];
  return [...horas.map(h => identificador(h)), ...DIAS_ISO.flatMap(dia => horas.map(h => identificador(h, dia)))];
}

/**
 * Quita las alarmas de las horas: las diarias (la semana 1 y Mi Radar de siempre) y las semanales de cada día. Idempotente:
 * cancelar una que no existe no es un error, y una que falla no impide cancelar las demás.
 */
export async function cancelarRecordatoriosDeRadar(): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  await sinRomper(
    () => Promise.all(todosLosIdentificadores().map(id => sinRomper(() => N.cancelScheduledNotificationAsync(id), undefined))),
    undefined,
  );
}

/**
 * Programa los avisos (`horasDeAviso`): una alarma DIARIA por hora, o —con días distintos— una SEMANAL por día y hora.
 * Devuelve `false` si no se pudo (sin permiso, web, Expo Go), y en ese caso NO deja nada a medias. `deMiRadar`: desde el
 * día 8 el aviso lleva la ruta que abre Mi Radar.
 */
export async function programarRecordatoriosDeRadar(
  avisos: readonly AvisoDeRadar[] = horasConSlot().map(hora => ({ hora, dia: null })),
  deMiRadar = false,
): Promise<boolean> {
  const N = cargarNotificaciones();
  if (!N) return false;
  if (!(await pedirPermiso())) return false;

  return sinRomper(async () => {
    await asegurarCanal();
    // Se cancela antes de programar: sin esto, cada arranque de la app sumaría doce alarmas más.
    await cancelarRecordatoriosDeRadar();
    for (const { hora, dia } of avisos) {
      await N.scheduleNotificationAsync({
        identifier: identificador(hora, dia),
        content: {
          title: `Código Renaser · ${horaEnPunto(hora)}`,
          body: '¿Dónde estás ahora mismo? Cinco preguntas, un minuto.',
          ...(deMiRadar ? { data: { route: RUTA_DE_MI_RADAR } } : {}),
        },
        trigger: {
          ...(dia === null
            ? { type: N.SchedulableTriggerInputTypes.DAILY }
            // `WEEKLY` numera al revés que ISO (1 = domingo): `weekdayDeExpo` lo traduce en un solo lugar.
            : { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday: weekdayDeExpo(dia) }),
          hour: hora,
          minute: MINUTO_DEL_AVISO,
          // BUG ENCONTRADO 2026-09-17: esto estaba en `content`, donde `expo-notifications` lo
          // ignora — `channelId` es un campo del DISPARADOR (`DailyTriggerInput`), no del
          // contenido. Con eso el canal "Código Renaser" que crea `asegurarCanal()` quedaba
          // creado y sin usar: los doce avisos caían en el canal de reserva de la librería
          // (`expo_notifications_fallback_notification_channel`). Seguían sonando —ese canal se
          // crea con importancia alta— pero la persona no podía silenciarlos ni dejarlos aparte
          // en los ajustes de Android, y si silenciaba ese canal genérico se le apagaban de una
          // vez TODOS los avisos de la app. Entraba por un `...spread`, que es justamente la
          // forma en que TypeScript no comprueba las propiedades de más: por eso `tsc` nunca dijo
          // nada. Va sin condicionar por plataforma, igual que en hábitos: en iOS el disparador
          // diario simplemente no mira este campo.
          channelId: CANAL_ANDROID,
        },
      });
    }
    return true;
  }, false);
}

/** `renaser.radar.invitacion`: el único aviso de fecha, para el día 8. */
const IDENTIFICADOR_DE_LA_INVITACION = 'renaser.radar.invitacion';
/** La invitación llega por la mañana del día 8, a las 09:00 locales. */
const HORA_DE_LA_INVITACION = 9;
/** Marca por cuenta: «ya se programó la invitación». */
const claveDeLaInvitacion = (usuarioId: string) => `radar.invitacionDia8.${usuarioId}`;

/** Quita la invitación. Idempotente. */
async function cancelarInvitacionDeMiRadar(): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  await sinRomper(() => N.cancelScheduledNotificationAsync(IDENTIFICADOR_DE_LA_INVITACION), undefined);
}

/**
 * Deja programada la invitación del día 8, **una sola vez por cuenta** y solo durante los días 1 a 7. Si el permiso no
 * está, no deja marca: la próxima vez que se abra la app dentro de la semana 1 se vuelve a intentar.
 */
async function programarInvitacionDeMiRadar(usuarioId: string, diaPrograma: number): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  await sinRomper(async () => {
    if (await AsyncStorage.getItem(claveDeLaInvitacion(usuarioId))) return;
    if (!(await pedirPermiso())) return;
    await asegurarCanal();
    // El día 8 es hoy más lo que falte: mañana si hoy es el 7, y así.
    const cuando = ahoraConfiable();
    cuando.setDate(cuando.getDate() + (MI_RADAR.primerDia - diaPrograma));
    cuando.setHours(HORA_DE_LA_INVITACION, 0, 0, 0);
    await N.scheduleNotificationAsync({
      identifier: IDENTIFICADOR_DE_LA_INVITACION,
      content: {
        title: 'Terminaste tu primera semana del Código Renaser',
        body: 'Si quieres seguir, enciende Mi Radar.',
        data: { route: RUTA_DE_MI_RADAR },
      },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL_ANDROID },
    });
    await AsyncStorage.setItem(claveDeLaInvitacion(usuarioId), '1');
  }, undefined);
}

/**
 * Deja las alarmas como corresponda al día de programa y a Mi Radar: las doce de siempre los días 1 a 7, las horas
 * elegidas desde el día 8 si está encendido (diarias, o semanales por día si algún día va distinto), y ninguna en
 * cualquier otro caso.
 *
 * Es la única función que deberían llamar las pantallas. Que cancelar sea parte de esto —y no una
 * decisión de quien llama— es lo que impide que a alguien le siga sonando un aviso que ya no corresponde (el de
 * la semana 1 el día 8, o los de Mi Radar apagado), que es el fallo más probable de un disparador que se repite solo.
 *
 * `usuarioId` solo hace falta para la invitación del día 8; sin él (o fuera de los días 1 a 7) no se programa.
 */
export async function sincronizarRecordatoriosDeRadar(
  diaPrograma: number | null,
  miRadar: MiRadarApi | null = null,
  usuarioId: string | null = null,
): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const avisos = horasDeAviso(diaPrograma, miRadar);
  if (avisos.length > 0) {
    await programarRecordatoriosDeRadar(avisos, miRadarCorresponde(diaPrograma));
  } else {
    await cancelarRecordatoriosDeRadar();
  }

  if (diaPrograma === null || !usuarioId) return;
  if (miRadarCorresponde(diaPrograma)) {
    // Ya lo encendió: la invitación sobra, aunque todavía no haya sonado.
    if (miRadar?.encendido) await cancelarInvitacionDeMiRadar();
  } else if (CONFIG_RADAR.activo && diaPrograma >= CONFIG_RADAR.primerDia && diaPrograma <= CONFIG_RADAR.ultimoDia) {
    await programarInvitacionDeMiRadar(usuarioId, diaPrograma);
  }
}
