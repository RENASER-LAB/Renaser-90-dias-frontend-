import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { registrarSuscripcionWebPush } from './webPush';
import {
  canalDeAlarma,
  esSonido,
  SONIDO_POR_DEFECTO,
  type CanalDeAlarma,
  type SonidoDeAlarma,
} from '../../alarmas/sonidoDeAlarma';
import { preferenciasDeAlarmas } from '../../alarmas/preferenciasDeAlarmas';
import { categoriaDeDimension } from '../../training/utils/dimensionDelHabito';
import type { PreferenciaHabitoApi } from '../types/habits.types';
import {
  canalDeLaCombinacion,
  combinacionDeLaApi,
  combinacionGuardada as leerCombinacionGuardada,
  COMBINACION_POR_DEFECTO,
  esLaCombinacionPorDefecto,
  mismaCombinacion,
  type CombinacionDeAlarma,
} from './utils/combinacionDeAlarma';
import {
  diasPropiosDe,
  fechasPropiasDe,
  firmaDelPlan,
  hayFechasVigentes,
  horaCorta,
  planDeAlarmas,
  usaEsquemaPorDia,
  type DiaPropio,
  type FechaPropia,
  type PedidoDeAlarmaDelDia,
  type PlanDeAlarmas,
} from './utils/alarmasPorDia';
import {
  anotarPuenteArmado,
  anotarPuenteDesarmado,
  leerNotaDeCumplido,
  quitarNotaDeCumplido,
} from './cumplidoDeHoy';
import { planDelPuente, puenteQueCorresponde } from './utils/puenteDeAlarmas';
import { fechaCompacta, type EntradaDeRepeticiones } from './utils/repeticionesDeAlarma';
import { vigenciaDelAvisoMin } from './utils/vigenciaDelAviso';
// SOLO tipos: `import type` se borra al compilar, así que esto NO carga el módulo en runtime. Ver
// el bloque "POR QUÉ NO SE IMPORTA ARRIBA" más abajo — importarlo de verdad rompe Expo Go.
import type * as TipoNotificaciones from 'expo-notifications';

/**
 * Las alarmas de los hábitos, en el teléfono.
 *
 * ## POR QUÉ LOCALES Y NO PUSH DEL SERVIDOR
 *
 * El backend YA calcula cuándo avisar de cada hábito (`AvisoHabitoService` +
 * `CalculadoraAvisosHabito`), lo guarda y lo deduplica en el módulo `notifications`, y tiene la
 * tabla `tokens_push` con su controlador. Lo único que falta ahí es el adaptador de salida: la
 * única implementación de `PushPort` es `NoOpPushAdapter`, o sea que hoy no sale nada del
 * servidor. Implementarlo necesita credenciales de Expo o FCM y un development build.
 *
 * La alarma local no necesita nada de eso y hace exactamente lo que se pidió — "configurá tus
 * alarmas" — así que va primero. **Y no tira nada por la borda**: la PREFERENCIA (si quiere
 * recordatorio y cuántos minutos antes) se guarda en el backend, en los campos que
 * `habit-preferences` ya tiene. El día que el push del servidor exista, el dato ya está donde
 * tiene que estar y esto pasa a ser el respaldo sin conexión.
 *
 * ## POR QUÉ NO SE IMPORTA ARRIBA (y por qué en Expo Go no hay recordatorios)
 *
 * `expo-notifications` tiene un módulo de efecto secundario —`DevicePushTokenAutoRegistration.fx`—
 * que llama a `addPushTokenListener` **al importarse**. Y el push remoto salió de Expo Go en el
 * SDK 53, así que ese registro tira:
 *
 *     Android Push notifications (remote notifications) functionality provided by
 *     expo-notifications was removed from Expo Go with the release of SDK 53.
 *
 * No es cómo se use la librería: **alcanza con importarla** para que la app no arranque en Expo Go.
 * Y como el import es estático, pasa aunque nadie toque un recordatorio.
 *
 * Por eso acá el módulo se carga con `require` PEREZOSO y solo cuando la plataforma lo soporta. Los
 * tipos entran por `import type`, que se borra al compilar y no carga nada.
 *
 * Consecuencia, dicha sin vueltas: **en Expo Go no hay recordatorios**. La pantalla no ofrece el
 * control, igual que en web. Funcionan en un development build y en la app publicada, que es donde
 * el aprendiz la va a usar. Lo que NO pasa es que la app se caiga por probarla en Expo Go.
 *
 * ## WEB
 *
 * `expo-notifications` no programa alarmas locales en web. La alternativa correcta es Web Push:
 * el navegador registra una suscripción por usuario, el backend conserva esa suscripción y el
 * scheduler existente envía los DOS avisos automáticos del hábito (inicio y vencimiento). La
 * alarma no depende de que la pestaña siga abierta.
 *
 * ## POR QUÉ LA ALARMA TIENE QUE SER EXACTA (2026-09-18)
 *
 * Android tiene dos clases de alarma y `expo-notifications` elige sola cuál usar, en
 * `ExpoSchedulingDelegate.setupAlarm`: la exacta si `canScheduleExactAlarms()` da `true`, y si no
 * una INEXACTA que el sistema puede posponer y entregar en lote con otras.
 *
 * Con el teléfono quieto de madrugada —el caso de una alarma para despertarse— esa postergación no
 * es de segundos: el lote sale recién en la siguiente ventana de mantenimiento de Doze. Un hábito
 * de las 06:30 llegaba 06:44, y los tres avisos (30 min antes, 10 min antes y la hora) aparecían
 * juntos en vez de por separado.
 *
 * `canScheduleExactAlarms()` da `false` mientras el permiso no esté declarado, y no lo declaraba
 * nadie: ni `app.json`, ni el manifiesto de `expo-notifications`, que solo trae `POST_NOTIFICATIONS`
 * y `RECEIVE_BOOT_COMPLETED`. Desde 2026-09-18 `app.json` pide `SCHEDULE_EXACT_ALARM` — y no
 * `USE_EXACT_ALARM`, que se concede solo pero la política de Google Play reserva a apps cuya función
 * principal es reloj o calendario. Ver `__tests__/alarmaExacta.test.ts`.
 *
 * **En Android 14+ el permiso se declara pero no se concede solo**: la persona tiene que activar
 * "Alarmas y recordatorios" para esta app en los ajustes del sistema. Sin eso, la alarma sigue
 * siendo inexacta — el permiso es condición necesaria, no suficiente.
 *
 * ## UN HÁBITO CUMPLIDO NO SUENA EL RESTO DEL DÍA (issue #33, 2026-10-27)
 *
 * Las alarmas de un hábito se repiten solas (`DAILY`, o `WEEKLY` por día) y una alarma que se repite no deja saltar un
 * día: cancelarla borra la de mañana, y dejarla puesta la deja sonar. Despertar cumplido a las 06:00 sonaba igual a las
 * 06:30. Al cumplir el hábito (`repeticiones.alCumplirElHabito`) se anota en `cumplidoDeHoy.ts` y, si le quedan avisos a
 * hoy, `programar` pone en lugar de las alarmas que se repiten un PUENTE de alarmas de FECHA desde mañana, 7 días
 * (`utils/puenteDeAlarmas.ts`), con el mismo texto, canal y datos. El día siguiente (o cuando ya sonaron todos los avisos
 * de hoy) la puesta al día vuelve al esquema normal. Mientras haya nota de cumplido de hoy, cualquier `programar` del hábito
 * —Plan, Training, Yo → Alarmas— lo respeta. Los ids del puente se guardan con los del hábito, así que `cancelar`, el
 * cambio de sonido, el aviso agrupado y el rearmado lo tratan como cualquier otra alarma.
 *
 * ## «SOLO ESTA SEMANA»: LAS FECHAS PROPIAS (spec 028, 2026-10-31)
 *
 * Una fecha concreta puede tener su propia hora, aviso o «cómo suena», o estar apagada (`dateOverrides` de `GET /habit-preferences`,
 * `fechasPropiasDe`). Por el mismo motivo del #33, una alarma semanal no puede saltarse esa fecha: el día de la semana afectado
 * deja de llevar la semanal y lleva alarmas de FECHA —una por aviso y por ocurrencia, hasta la última fecha propia más dos
 * semanas de cola, con el tope de `TOPE_DE_ALARMAS_DE_FECHA`—, con los identificadores `habito-{id}-d{iso}-0` (la etiqueta del push
 * de respaldo, la primera) y `habito-{id}-f{AAAAMMDD}-{n}`. Los demás días siguen semanales. Se guardan con los ids del hábito, así
 * que `cancelar`, el cambio de sonido, el aviso agrupado, el rearmado y cerrar sesión las tratan como al puente. La puesta al día
 * (`ajustarRecordatoriosAlServidor`) lo arma, lo deja mientras la firma coincida y lo revierte solo cuando el servidor ya no manda
 * ninguna fecha vigente. Quien reprograma sin saber de fechas (`programar` sin `opciones.fechas`) conserva las que el teléfono
 * tenía; la puesta al día, que sí sabe, manda `fechas: []` o las del servidor. Límite aceptado: si la persona no abre la app en las
 * dos semanas que siguen a la última fecha propia, ese día se queda sin alarma hasta que la abra; un APK anterior no las conoce.
 * El puente del #33 y las repeticiones de la spec 009 leen la misma cuenta por día (`valoresDelDia`) y la respetan.
 *
 * ## POR QUÉ SE GUARDA EL IDENTIFICADOR
 *
 * `scheduleNotificationAsync` devuelve un id y esa es la ÚNICA forma de cancelar esa alarma
 * después. Sin guardarlo, cambiar la hora de un hábito dejaría la alarma vieja sonando para
 * siempre y sumaría una nueva cada vez. Se guarda por usuario y por hábito.
 */

const PREFIJO_CLAVE = 'renaser.habitos.recordatorio.';

/** El repaso semanal es UNO por persona, no uno por hábito: clave aparte. */
const CLAVE_REPASO = 'renaser.habitos.repasoSemanal.';
/** El repaso quedó pedido pero sin alarma: se cerró sesión (E-413) y se rearma al volver a entrar. */
export const REPASO_SIN_ALARMA = 'sin-alarma';

/**
 * QUÉ antelaciones eligió, por hábito.
 *
 * **Por qué acá y no en el backend.** `preferencias_horario.minutos_recordatorio` es UN solo
 * número, y desde que se puede pedir "30 min antes Y a la hora" el dato es un conjunto. Antes de
 * inventarle al servidor una semántica que nadie pidió —o de guardar solo uno y perder el resto en
 * silencio—, el conjunto vive donde viven las alarmas: en este teléfono.
 *
 * Al backend se le sigue mandando la antelación MÁS TEMPRANA en `reminderMinutesBefore`, que es la
 * que un push del servidor usaría el día que exista. No es una mentira a medias: es el dato que ese
 * campo puede representar, y el que mejor describe "cuándo hay que empezar a avisar".
 */
const CLAVE_ANTELACIONES = 'renaser.habitos.antelaciones.';

/**
 * Domingo a las 19:00.
 *
 * **`1` es DOMINGO, no lunes.** El trigger `WEEKLY` de expo-notifications numera los días con
 * `1 = domingo` (está en sus propios tipos: *"Weekdays are specified with a number from 1 through
 * 7, with 1 indicating Sunday"*), o sea al revés que ISO-8601, que es lo que usa el resto de este
 * proyecto (`NOMBRE_ISO_DEL_DIA`, `dia_semana` en la base). Poner 7 acá mandaría el aviso los
 * sábados y nadie se daría cuenta hasta que alguien lo reportara.
 *
 * Las 19:00 del domingo: la tarde en que ya se sabe cómo viene la semana y todavía se puede
 * acomodar. Más temprano nadie está pensando en el lunes; más tarde ya no hay ganas de tocar nada.
 */
const DOMINGO_EN_EXPO = 1;
const HORA_REPASO = 19;
const MINUTO_REPASO = 0;

/**
 * Canal de Android. Sin uno propio, el sistema agrupa estos avisos con cualquier otro.
 *
 * Desde 2026-09-26 (E-10) un hábito puede sonar con otro sonido —el elegido en Yo → Alarmas, que
 * desde la voz rige para todos los hábitos (ver `sonidoDe`)—, y en Android el sonido es del canal. El de siempre conserva este id; los otros salen de
 * `canalDeAlarma` (`features/alarmas/sonidoDeAlarma.ts`).
 */
const CANAL_ANDROID = canalDeAlarma('habitos', SONIDO_POR_DEFECTO);

/** El sonido elegido para un hábito. Sin elegir = el del teléfono, como siempre. */
const CLAVE_SONIDO = 'renaser.habitos.sonido.';

const MINUTOS_POR_DIA = 24 * 60;

/**
 * Expo Go se reconoce por `executionEnvironment`, que es el criterio que Expo documenta —
 * `appOwnership` está deprecado. En un development build o en la app publicada da `Bare`/`Standalone`.
 */
const ES_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Alarmas locales: solo development build/app instalada en Android o iOS. */
export const HAY_RECORDATORIOS_LOCALES = Platform.OS !== 'web' && !ES_EXPO_GO;

/** Web Push: requiere navegador compatible, HTTPS y la clave publica VAPID del despliegue. */
export const HAY_RECORDATORIOS_WEB = Platform.OS === 'web';

/** La pantalla puede ofrecer recordatorios cuando alguno de los dos canales esta disponible. */
export const HAY_RECORDATORIOS = HAY_RECORDATORIOS_LOCALES || HAY_RECORDATORIOS_WEB;

/** Pide el permiso web durante el gesto de guardar, antes de cualquier request de red. */
export async function prepararWebPush(): Promise<boolean> {
  return HAY_RECORDATORIOS_WEB ? registrarSuscripcionWebPush() : false;
}

let modulo: typeof TipoNotificaciones | null = null;

/**
 * Carga `expo-notifications` la primera vez que hace falta, y nunca donde no se puede.
 *
 * El `require` es a propósito y no un `import()` dinámico: Metro resuelve el `require` en el
 * bundle igual, pero solo EJECUTA el módulo cuando esta función corre — que es exactamente lo que
 * hace falta para que el efecto secundario del push no se dispare en Expo Go.
 */
/**
 * Se exporta (2026-09-11) porque el Código Renaser necesita el MISMO cargador perezoso: importar
 * `expo-notifications` arriba rompe Expo Go, y ese detalle vale una sola implementación. Se
 * exporta con nombre propio en vez de mudar el archivo para no tocar los recordatorios de hábitos,
 * que hoy funcionan y solo se pueden probar en un teléfono.
 */
export function cargarNotificaciones(): typeof TipoNotificaciones | null {
  return notificaciones();
}

function notificaciones(): typeof TipoNotificaciones | null {
  if (!HAY_RECORDATORIOS_LOCALES) return null;
  if (modulo === null) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    modulo = require('expo-notifications') as typeof TipoNotificaciones;
    modulo.setNotificationHandler({
      handleNotification: async notificacion => {
        // D-221 (2026-09-29): un mensaje de chat con la app abierta no sale como aviso del sistema.
        // Del chat que se está mirando no suena nada; de otro, un «pop» dentro de la app y la lista
        // se relee (`features/chat/avisos`). Los demás avisos, como siempre.
        if (avisoDeChatAtendidoEnLaApp(notificacion.request.content.data)) {
          return { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
        }
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      },
    });
  }
  return modulo;
}

/**
 * Si el aviso es de un chat, lo atiende la app (D-221) y devuelve `true`. Se carga con `require` acá
 * adentro para no arrastrar `expo-audio` a todo el que importa este módulo. Si algo falla, `false`:
 * el aviso se muestra como cualquier otro, que es mejor que perderlo.
 */
function avisoDeChatAtendidoEnLaApp(datos: unknown): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { atenderAvisoDeChatEnPrimerPlano } = require('../../chat/avisos/atenderAvisoDeChat') as typeof import('../../chat/avisos/atenderAvisoDeChat');
    return atenderAvisoDeChatEnPrimerPlano(datos) !== 'noEsDeChat';
  } catch {
    return false;
  }
}

/** Ninguna operación de almacenamiento debe poder tumbar la app. */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

/**
 * Pide permiso, si hace falta. Devuelve `false` en web y cuando la persona lo niega — el llamador
 * tiene que respetar ese `false` y no prometer un aviso que no va a llegar.
 */
/**
 * E-410: después de programar o cancelar, los avisos que quedaron a la misma hora se ordenan para que
 * suene uno solo que nombre a todos (`alarmas/avisosJuntos.ts`). Se carga acá adentro porque aquel
 * módulo usa este: un import de ida y vuelta dejaría uno sin cargar.
 */
async function reagrupar(userId: string): Promise<void> {
  await sinRomper(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { agruparAvisosQueCoinciden } = require('../../alarmas/avisosJuntos') as typeof import('../../alarmas/avisosJuntos');
    await agruparAvisosQueCoinciden(userId);
  }, undefined);
}

export async function pedirPermiso(): Promise<boolean> {
  const N = notificaciones();
  if (!N) return false;
  return sinRomper(async () => {
    const actual = await N.getPermissionsAsync();
    if (actual.granted) return true;
    // `canAskAgain === false` = ya lo negó y iOS no vuelve a preguntar: insistir no hace nada.
    if (!actual.canAskAgain) return false;
    const pedido = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return pedido.granted;
  }, false);
}

/**
 * El canal de Android tiene que existir antes de programar contra él. Idempotente.
 *
 * Se exporta (2026-09-26) para las alarmas de eventos, que necesitan exactamente lo mismo.
 */
export async function asegurarCanal(canal: CanalDeAlarma = CANAL_ANDROID): Promise<void> {
  const N = notificaciones();
  if (!N || Platform.OS !== 'android') return;
  // SIN `sound` para el del sistema: en un canal de Android ese campo es el NOMBRE DE ARCHIVO de un
  // sonido propio empaquetado en la app, no la palabra "el de siempre". Poniendo 'default' la
  // librería avisa que no encuentra un archivo llamado así. Omitirlo es lo que deja el sonido del
  // sistema; `null` es "sin sonido" y un nombre es el archivo propio.
  await N.setNotificationChannelAsync(canal.id, {
    name: canal.nombre,
    importance: N.AndroidImportance.HIGH,
    ...(canal.sonidoDelCanal === undefined ? {} : { sound: canal.sonidoDelCanal }),
    // Spec 009: la vibración también es del canal. Solo se dice cuando el canal la trae (los de «Cómo suena»):
    // los de siempre no cambian, y un canal ya creado ignora estas opciones de todos modos.
    ...(canal.vibra === undefined ? {} : { enableVibrate: canal.vibra }),
  });
}

/**
 * El sonido de ese hábito en este teléfono: el que se le fijó (hoy solo Despertar) y, si no, el
 * elegido en Yo → Alarmas → Sonido.
 *
 * > **Cambiado 2026-09-26 (voz).** Sin sonido fijado devolvía siempre el del teléfono: el sonido de
 * > Yo → Alarmas solo llegaba a Despertar y a los eventos. El dueño pidió la voz «Tu hábito está por
 * > empezar» como sonido del recordatorio de hábito, y la única forma de elegirla es esa sección, así
 * > que ahora rige para todos los hábitos. Quien nunca tocó Alarmas sigue en «El del teléfono».
 */
export async function sonidoDe(userId: string, habitoId: string): Promise<SonidoDeAlarma> {
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(`${CLAVE_SONIDO}${userId}.${habitoId}`);
    if (esSonido(crudo)) return crudo;
    return (await preferenciasDeAlarmas(userId)).sonido;
  }, SONIDO_POR_DEFECTO);
}

/**
 * Las alarmas de hábitos de esta persona en este teléfono, agrupadas por hábito: `habitoId` → ids
 * (sin el repaso de los domingos, que no es de un hábito y tiene su propia clave). Para pasarlas al
 * sonido nuevo: desde que la «Voz» dice el nombre del hábito (2026-09-27) cada hábito puede ir a su
 * propio canal, y el aviso ya programado no dice de qué hábito es.
 */
export async function recordatoriosPorHabito(userId: string): Promise<Map<string, string[]>> {
  const porHabito = new Map<string, string[]>();
  if (!HAY_RECORDATORIOS_LOCALES) return porHabito;
  return sinRomper(async () => {
    const prefijo = `${PREFIJO_CLAVE}${userId}.`;
    const claves = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefijo));
    for (const clave of claves) {
      const guardado = await AsyncStorage.getItem(clave);
      if (guardado) porHabito.set(clave.slice(prefijo.length), leerIds(guardado));
    }
    return porHabito;
  }, porHabito);
}

/** Los ids de TODAS las alarmas de hábitos de esta persona en este teléfono. */
export async function idsDeRecordatoriosDeHabitos(userId: string): Promise<string[]> {
  return [...(await recordatoriosPorHabito(userId)).values()].flat();
}

/** El título del aviso: el nombre del hábito, con «En N min:» delante si es antes de la hora. */
export function tituloDelAviso(titulo: string, minutosAntes: number): string {
  return minutosAntes > 0 ? `En ${minutosAntes} min: ${titulo}` : titulo;
}

/**
 * Lo inverso de `tituloDelAviso`: el nombre del hábito a partir del título de un aviso ya
 * programado. Lo usa el cambio de sonido para saber si ese hábito tiene voz propia.
 */
export function habitoDelAviso(tituloAviso: string): string {
  return tituloAviso.replace(/^En \d+ min: /, '');
}

/**
 * Guarda el sonido de un hábito. NO reprograma: quien lo llama decide (Yo → Alarmas reprograma
 * Despertar en el acto). Lo guardado lo respeta cualquier `programar` posterior —desde Plan, desde
 * Training o desde Yo—, así que cambiarle la hora no le devuelve el sonido de siempre.
 */
export async function fijarSonido(userId: string, habitoId: string, sonido: SonidoDeAlarma): Promise<void> {
  await sinRomper(() => AsyncStorage.setItem(`${CLAVE_SONIDO}${userId}.${habitoId}`, sonido), undefined);
}

function claveDe(userId: string, habitoId: string): string {
  return `${PREFIJO_CLAVE}${userId}.${habitoId}`;
}

/**
 * Lo que el teléfono recuerda de un hábito con alarmas POR DÍA (spec 008): la firma del plan que programó (para
 * saber, sin tocar la librería, si ya es lo que corresponde) y lo propio de cada día (para que quien cambia la
 * hora general sin saber de días —Plan— no deje el hábito en el esquema diario). Desde la spec 028 también recuerda las
 * fechas propias («solo esta semana») con las que se programó. Sin esta clave, el hábito está en el esquema diario,
 * como siempre.
 */
const PREFIJO_ESQUEMA = 'renaser.habitos.esquema.';

interface EsquemaGuardado {
  firma: string;
  dias: DiaPropio[];
  /** Spec 028: las fechas propias con las que se programó (para reprogramar sin leer el servidor). Ausente = ninguna. */
  fechas?: FechaPropia[];
}

function claveEsquema(userId: string, habitoId: string): string {
  return `${PREFIJO_ESQUEMA}${userId}.${habitoId}`;
}

async function esquemaGuardado(userId: string, habitoId: string): Promise<EsquemaGuardado | null> {
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(claveEsquema(userId, habitoId));
    if (!crudo) return null;
    const leido = JSON.parse(crudo) as Partial<EsquemaGuardado>;
    if (typeof leido.firma !== 'string' || !Array.isArray(leido.dias)) return null;
    return Array.isArray(leido.fechas) && leido.fechas.length > 0
      ? { firma: leido.firma, dias: leido.dias, fechas: leido.fechas }
      : { firma: leido.firma, dias: leido.dias };
  }, null);
}

/** Spec 028: las fechas propias con las que este teléfono programó el hábito, o `null` si no tenía ninguna. */
async function fechasGuardadas(userId: string, habitoId: string): Promise<FechaPropia[] | null> {
  return (await esquemaGuardado(userId, habitoId))?.fechas ?? null;
}

/**
 * Spec 009: «cómo suena» la alarma GENERAL del hábito en este teléfono: la combinación con la que se programó, solo si
 * no es la de siempre. Sirve para que quien reprograma sin saber de «Cómo suena» (Plan al cambiar la hora, Yo →
 * Alarmas con Despertar) no pierda la elección. Lo propio de cada día vive en `esquemaGuardado`.
 */
const PREFIJO_COMBINACION = 'renaser.habitos.combinacion.';

function claveCombinacion(userId: string, habitoId: string): string {
  return `${PREFIJO_COMBINACION}${userId}.${habitoId}`;
}

/** La combinación general con la que quedó este hábito en el teléfono, o `null` (la de siempre). */
export async function combinacionGeneralGuardada(userId: string, habitoId: string): Promise<CombinacionDeAlarma | null> {
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(claveCombinacion(userId, habitoId));
    return crudo ? leerCombinacionGuardada(JSON.parse(crudo)) : null;
  }, null);
}

async function guardarCombinacionGeneral(userId: string, habitoId: string, alarma: CombinacionDeAlarma | null): Promise<void> {
  await sinRomper(async () => {
    if (alarma && !esLaCombinacionPorDefecto(alarma)) {
      await AsyncStorage.setItem(claveCombinacion(userId, habitoId), JSON.stringify(alarma));
    } else {
      await AsyncStorage.removeItem(claveCombinacion(userId, habitoId));
    }
  }, undefined);
}

/**
 * Spec 009: pone las repeticiones del hábito. El módulo se carga acá adentro porque él importa este (un import de ida y
 * vuelta dejaría uno sin cargar), igual que `reagrupar` con `avisosJuntos`. No tira.
 */
async function sincronizarLasRepeticiones(
  userId: string,
  habitoId: string,
  titulo: string,
  entrada: {
    horaGeneral: string | null;
    avisosGenerales: readonly number[];
    dias: readonly DiaPropio[] | null | undefined;
    fechas?: readonly FechaPropia[] | null;
    alarmaGeneral: CombinacionDeAlarma | null | undefined;
    cambio?: CambioDiferido | null;
    dimension?: string | null;
  },
): Promise<void> {
  await sinRomper(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sincronizarRepeticiones } = require('./repeticiones') as typeof import('./repeticiones');
    await sincronizarRepeticiones(userId, { habitoId, titulo, ...entrada });
  }, undefined);
}

/** Cancela TODAS las alarmas de ese hábito. Idempotente. */
export async function cancelar(userId: string, habitoId: string): Promise<void> {
  const N = notificaciones();
  if (!N) return;
  await sinRomper(async () => {
    const clave = claveDe(userId, habitoId);
    const guardado = await AsyncStorage.getItem(clave);
    if (!guardado) return;
    for (const id of leerIds(guardado)) {
      await N.cancelScheduledNotificationAsync(id);
    }
    await AsyncStorage.removeItem(clave);
  }, undefined);
  // Las alarmas por día (spec 008) se acaban de cancelar con las demás; lo que se recordaba de ellas, también.
  await sinRomper(() => AsyncStorage.removeItem(claveEsquema(userId, habitoId)), undefined);
  // Spec 009: y sus repeticiones, y cómo sonaba. Quien reprograma lo lee ANTES de cancelar (`programar`).
  await sinRomper(() => AsyncStorage.removeItem(claveCombinacion(userId, habitoId)), undefined);
  await sinRomper(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cancelarRepeticiones } = require('./repeticiones') as typeof import('./repeticiones');
    await cancelarRepeticiones(habitoId);
  }, undefined);
  // Un cambio de hora que esperaba su fecha (D-217) deja de tener sentido: lo que se cancela, se
  // cancela entero.
  await sinRomper(() => AsyncStorage.removeItem(claveDiferido(userId, habitoId)), undefined);
  await sinRomper(() => AsyncStorage.removeItem(claveHora(userId, habitoId)), undefined);
  // Issue #33: el puente de un hábito cumplido va entre las alarmas que se acaban de cancelar (sus ids se guardan con los
  // del hábito), así que ya no está. La nota de «se cumplió hoy» NO se borra: reprogramar el hábito el mismo día (Plan, la
  // puesta al día) tiene que seguir sabiendo que hoy no debe sonar.
  await anotarPuenteDesarmado(userId, habitoId);
  await reagrupar(userId);
}

/**
 * A qué hora quedó programado un hábito en este teléfono (y desde cuándo, si el cambio esperaba su
 * fecha). Para comparar con el servidor al ponerse al día (D-217): sin esto, un cambio de hora hecho en
 * otro dispositivo no movía esta alarma. Las alarmas de antes de este dato no lo tienen y no se comparan.
 */
const PREFIJO_HORA = 'renaser.habitos.hora.';

interface HoraProgramada {
  hora: string;
  desde?: string;
}

function claveHora(userId: string, habitoId: string): string {
  return `${PREFIJO_HORA}${userId}.${habitoId}`;
}

async function horaProgramada(userId: string, habitoId: string): Promise<HoraProgramada | null> {
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(claveHora(userId, habitoId));
    return crudo ? (JSON.parse(crudo) as HoraProgramada) : null;
  }, null);
}

/**
 * Los ids guardados. Tolera el formato VIEJO —un id suelto, de cuando había un solo recordatorio
 * por hábito— para no dejar alarmas huérfanas sonando en los teléfonos que ya lo tenían puesto.
 */
function leerIds(guardado: string): string[] {
  try {
    const leido = JSON.parse(guardado);
    return Array.isArray(leido) ? leido.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [guardado];
  }
}

/** Las antelaciones elegidas para un hábito, en minutos. Vacío = sin aviso. */
export async function antelacionesDe(userId: string, habitoId: string): Promise<number[]> {
  if (!HAY_RECORDATORIOS) return [];
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(CLAVE_ANTELACIONES + `${userId}.${habitoId}`);
    if (!crudo) return [];
    const leido = JSON.parse(crudo);
    return Array.isArray(leido) ? leido.filter((x): x is number => typeof x === 'number') : [];
  }, []);
}

/** Lo que acompaña a una alarma de hábito además de la hora. */
export interface OpcionesDelAviso {
  /**
   * La dimensión de Training del hábito (`CUERPO`, `MENTE`…), para que tocar el aviso la abra (D-218).
   * Sin ella el aviso igual abre Training, y la pantalla busca el hábito por su id.
   */
  dimension?: string | null;
  /**
   * Spec 008: lo propio de cada día de la semana (hora, aviso, apagado). Si algún día es distinto, el hábito
   * pasa al esquema POR DÍA (una alarma semanal por día y antelación, a la hora de ese día). Sin esto, o con
   * todos los días iguales, queda el esquema diario de siempre. Quien no sabe de días (Yo → Alarmas con
   * Despertar) no lo pasa: el hábito vuelve al esquema diario hasta la próxima puesta al día, que lo corrige.
   */
  dias?: readonly DiaPropio[] | null;
  /**
   * Spec 028: las fechas con cambio «solo esta semana» (`fechasPropiasDe(dateOverrides)`). Con alguna vigente el hábito va por
   * día y los días de la semana afectados llevan alarmas de FECHA en lugar de las semanales, que no pueden saltarse una fecha.
   * Sin ninguna vigente el plan es el de siempre. `undefined` = las que este teléfono ya tenía para el hábito (quien reprograma sin
   * saber de fechas —el editor de Training al guardar «todas las semanas», Yo → Alarmas con Despertar— no las pierde); `[]` o
   * `null` = ninguna (la puesta al día, cuando el servidor ya no manda ninguna).
   */
  fechas?: readonly FechaPropia[] | null;
  /**
   * Spec 009: «cómo suena» la alarma general del hábito (la de los días que no tienen la suya). `undefined` = la que
   * este teléfono ya tenía para el hábito (quien reprograma sin saber de «Cómo suena» no la pierde); `null` = la de
   * siempre (sonido y vibración, sin voz propia, sin repetir).
   */
  alarma?: CombinacionDeAlarma | null;
}

/**
 * La ruta que lleva el aviso en `data.route`: la misma que manda el servidor en su push de respaldo
 * (D-217), `/habitos/{habitoId}?dimension={BODY|MIND|CONSCIENCE|SPIRIT}`. Tocarlo abre Training con esa
 * dimensión (D-218, `AbridorDeAvisos`). Con la categoría del catálogo y no la palabra de la pantalla:
 * `ESPÍRITU` lleva tilde y `VIDA Y NEGOCIO` espacios, y una ruta no es lugar para eso.
 */
export function rutaDelAvisoDeHabito(habitoId: string, dimension?: string | null): string {
  const categoria = categoriaDeDimension(dimension);
  const base = `/habitos/${encodeURIComponent(habitoId)}`;
  return categoria ? `${base}?dimension=${categoria}` : base;
}

/**
 * El identificador de la alarma local del aviso de inicio de un hábito (spec 007, FR-014): el mismo `tag`
 * que el servidor manda en su push de respaldo (`habito-{habitoId}-inicio`, `AvisoDeHabito.etiqueta()`).
 *
 * `expo-notifications` muestra una alarma local con su `identifier` como `tag` de la notificación, y en
 * Android el push del servidor se muestra con `data.tag` como identificador: si los dos coinciden, el que
 * llega segundo REEMPLAZA al primero en la bandeja en vez de apilarse. Pasa con el teléfono que no
 * confirmó sus alarmas (versión vieja, más de un día sin abrir la app, sin permiso de alarmas exactas) y
 * por eso recibe también el respaldo.
 *
 * Solo se le pone a UNA alarma por hábito: la antelación más temprana, que es la que el servidor conoce
 * (`minutos_recordatorio`, ver `CLAVE_ANTELACIONES`). Los identificadores son únicos por pedido, así que
 * las demás antelaciones, que son solo del teléfono, siguen con el UUID que les pone la librería.
 */
export function identificadorDelAvisoDeInicio(habitoId: string): string {
  return `habito-${habitoId}-inicio`;
}

function contenidoDelAviso(
  titulo: string,
  minutosAntes: number,
  horaHHmm: string,
  canal: CanalDeAlarma,
  ruta: string,
  alarma?: CombinacionDeAlarma | null,
): TipoNotificaciones.NotificationContentInput {
  return {
    title: tituloDelAviso(titulo, minutosAntes),
    body: `Te toca a las ${horaHHmm}.`,
    // `true` y no `'default'`: la cadena se interpreta como el nombre de un archivo de sonido
    // propio, y la librería se queja de no encontrarlo. El booleano pide el del sistema.
    sound: canal.sonidoDelAviso,
    // Spec 009: cómo suena, SOLO si no es lo de siempre. Así el cambio de sonido de Yo → Alarmas y el aviso agrupado
    // (que re-programan la alarma ya puesta, sin saber del hábito) mantienen el canal que le toca. Ausente = la de siempre.
    // Issue #40: `vigenteMin`, hasta cuántos minutos después de su hora nominal el aviso sigue siendo verdad. Android lo lee
    // al entregar la alarma (`scripts/arreglar-aviso-tardio.js`) y no muestra el que llegó cuando el hábito ya pasó.
    data: alarma && !esLaCombinacionPorDefecto(alarma)
      ? { route: ruta, alarma, vigenteMin: vigenciaDelAvisoMin(minutosAntes) }
      : { route: ruta, vigenteMin: vigenciaDelAvisoMin(minutosAntes) },
  };
}

/** El canal de una alarma de este hábito con esta combinación y el tono de Yo → Alarmas (spec 009). */
async function canalDeLaAlarma(
  userId: string,
  habitoId: string,
  titulo: string,
  alarma: CombinacionDeAlarma | null | undefined,
): Promise<CanalDeAlarma> {
  return canalDeLaCombinacion('habitos', await sonidoDe(userId, habitoId), alarma ?? COMBINACION_POR_DEFECTO, {
    id: habitoId,
    titulo,
  });
}

/**
 * Pone en el teléfono las alarmas del esquema POR DÍA (spec 008): una por día encendido y por antelación,
 * semanales, con el identificador del día. Deja anotado lo que hace falta para no repetir el trabajo (la firma)
 * y para que un cambio de hora general hecho desde otra pantalla respete los días (lo propio de cada uno).
 *
 * Corre dentro de un `sinRomper` del llamador, ya con permiso. Devuelve `true`.
 */
async function ponerLasAlarmasPorDia(
  N: typeof TipoNotificaciones,
  userId: string,
  habitoId: string,
  titulo: string,
  pedidos: readonly PedidoDeAlarmaDelDia[],
  antelacionesGenerales: readonly number[],
  horaAnotada: HoraProgramada,
  opciones: OpcionesDelAviso,
): Promise<boolean> {
  const tono = await sonidoDe(userId, habitoId);
  // Spec 009: cada día puede sonar de otra manera, así que el canal es el de SU combinación (varios canales por hábito).
  const canales = new Map<string, CanalDeAlarma>();
  const canalDe = async (alarma: CombinacionDeAlarma): Promise<CanalDeAlarma> => {
    const canal = canalDeLaCombinacion('habitos', tono, alarma, { id: habitoId, titulo });
    if (!canales.has(canal.id)) {
      await asegurarCanal(canal);
      canales.set(canal.id, canal);
    }
    return canal;
  };
  const ruta = rutaDelAvisoDeHabito(habitoId, opciones.dimension);
  const ids: string[] = [];
  for (const pedido of pedidos) {
    const canal = await canalDe(pedido.alarma);
    const trigger = pedido.disparo.tipo === 'semanal'
      ? {
        type: N.SchedulableTriggerInputTypes.WEEKLY,
        weekday: pedido.disparo.weekday,
        hour: pedido.disparo.hora,
        minute: pedido.disparo.minuto,
        channelId: canal.id,
      }
      : { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(pedido.disparo.instanteMs), channelId: canal.id };
    // El identificador es el del día (`habito-{id}-d{iso}-{n}`): programar de nuevo el mismo día REEMPLAZA la
    // alarma en vez de duplicarla, y el `-0` es la etiqueta del push de respaldo del servidor (research R6).
    ids.push(await N.scheduleNotificationAsync({
      identifier: pedido.identificador,
      content: contenidoDelAviso(titulo, pedido.minutosAntes, pedido.horaDelDia, canal, ruta, pedido.alarma),
      trigger,
    }));
  }
  await AsyncStorage.setItem(claveDe(userId, habitoId), JSON.stringify(ids));
  if (antelacionesGenerales.length > 0) {
    await AsyncStorage.setItem(CLAVE_ANTELACIONES + `${userId}.${habitoId}`, JSON.stringify(antelacionesGenerales));
  }
  await AsyncStorage.setItem(claveHora(userId, habitoId), JSON.stringify(horaAnotada));
  const guardado: EsquemaGuardado = {
    firma: firmaDelPlan({ esquema: 'porDia', pedidos: [...pedidos] }),
    dias: [...(opciones.dias ?? [])],
    ...((opciones.fechas?.length ?? 0) > 0 ? { fechas: [...(opciones.fechas as readonly FechaPropia[])] } : {}),
  };
  await AsyncStorage.setItem(claveEsquema(userId, habitoId), JSON.stringify(guardado));
  await guardarCombinacionGeneral(userId, habitoId, opciones.alarma ?? null);
  return true;
}

/**
 * Issue #33 (2026-10-27): si el hábito ya se cumplió HOY y a hoy todavía le queda algún aviso por sonar, pone en lugar de
 * las alarmas que se repiten el PUENTE: una alarma de FECHA por cada aviso de los próximos 7 días, saltando hoy
 * (`planDelPuente`), con el mismo texto, canal y datos. Una alarma diaria o semanal no se puede saltar solo por hoy, y
 * esa era la causa de que Despertar cumplido a las 06:00 sonara igual a las 06:30.
 *
 * Deja guardado lo mismo que las otras puestas (ids, avisos generales, hora, días y cómo suena), para que quien reprograma
 * sin saber de esto (Plan al mover la hora) y la puesta al día del servidor vean un hábito normal, y anota en la nota de
 * «se cumplió hoy» que el puente está armado. Corre con las alarmas anteriores ya canceladas y con permiso.
 *
 * Devuelve `true` si puso el puente (el llamador NO pone el esquema normal) y `false` si no hace falta: no se cumplió hoy,
 * o ya sonaron todos los avisos de hoy (no se gasta el puente).
 */
async function ponerElPuenteSiHoyYaSeCumplio(
  N: typeof TipoNotificaciones,
  userId: string,
  habitoId: string,
  titulo: string,
  entrada: EntradaDeRepeticiones,
  antelacionesGenerales: readonly number[],
  horaAnotada: HoraProgramada,
  opciones: OpcionesDelAviso,
  planNormal: PlanDeAlarmas,
  ahora: Date,
): Promise<boolean> {
  const hoy = fechaCompacta(ahora);
  const nota = await leerNotaDeCumplido(userId, habitoId);
  if (!nota || nota.dia !== hoy) return false;
  const puente = planDelPuente(entrada, ahora);
  if (puente.quedanHoy === 0) return false;
  const tono = await sonidoDe(userId, habitoId);
  const canales = new Map<string, CanalDeAlarma>();
  const ruta = rutaDelAvisoDeHabito(habitoId, opciones.dimension);
  const ids: string[] = [];
  try {
    for (const pedido of puente.pedidos) {
      const canal = canalDeLaCombinacion('habitos', tono, pedido.alarma, { id: habitoId, titulo });
      if (!canales.has(canal.id)) {
        await asegurarCanal(canal);
        canales.set(canal.id, canal);
      }
      ids.push(await N.scheduleNotificationAsync({
        identifier: pedido.identificador,
        content: contenidoDelAviso(titulo, pedido.minutosAntes, pedido.horaDelDia, canal, ruta, pedido.alarma),
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(pedido.instanteMs), channelId: canal.id },
      }));
    }
  } finally {
    // Lo que alcanzó a ponerse queda guardado aunque una falle: sin sus ids nadie podría cancelarlo.
    await AsyncStorage.setItem(claveDe(userId, habitoId), JSON.stringify(ids));
  }
  if (antelacionesGenerales.length > 0) {
    await AsyncStorage.setItem(CLAVE_ANTELACIONES + `${userId}.${habitoId}`, JSON.stringify(antelacionesGenerales));
  }
  await AsyncStorage.setItem(claveHora(userId, habitoId), JSON.stringify(horaAnotada));
  if (planNormal.esquema === 'porDia') {
    const guardado: EsquemaGuardado = {
      firma: firmaDelPlan(planNormal),
      dias: [...(opciones.dias ?? [])],
      ...((opciones.fechas?.length ?? 0) > 0 ? { fechas: [...(opciones.fechas as readonly FechaPropia[])] } : {}),
    };
    await AsyncStorage.setItem(claveEsquema(userId, habitoId), JSON.stringify(guardado));
  }
  await guardarCombinacionGeneral(userId, habitoId, opciones.alarma ?? null);
  await anotarPuenteArmado(userId, habitoId, hoy);
  return true;
}

/**
 * ¿El puente de este hábito está como tiene que estar? No, si hay uno armado que ya no corresponde (el día pasó, o ya
 * sonaron todos los avisos de hoy) o si el hábito se cumplió hoy, todavía le quedan avisos y no hay puente armado (el
 * cumplido llegó mientras corría otra puesta, o sin saber de las alarmas). Con `true`, la puesta al día vuelve a poner
 * las alarmas del hábito aunque nada más haya cambiado: `programar` deja el estado que corresponde, así que converge.
 */
async function hayQueConciliarElPuente(userId: string, entrada: EntradaDeRepeticiones, ahora: Date): Promise<boolean> {
  const nota = await leerNotaDeCumplido(userId, entrada.habitoId);
  if (!nota) return false;
  const quiere = puenteQueCorresponde(nota.dia, entrada, ahora);
  if (nota.puenteDe !== quiere) return true;
  // Sin puente y de un día que ya pasó, la nota no sirve más.
  if (nota.puenteDe === null && nota.dia < fechaCompacta(ahora)) {
    await quitarNotaDeCumplido(userId, entrada.habitoId);
  }
  return false;
}

/**
 * Programa los avisos de un hábito: uno por cada antelación elegida.
 *
 * Cancela primero el anterior: si no, cambiar la hora dejaría sonando la alarma vieja y sumaría
 * una nueva cada vez. Devuelve `false` si no se pudo (sin permiso, o web).
 *
 * **Esquema (spec 008).** Sin `opciones.dias`, o con todos los días iguales, es una alarma DIARIA por antelación,
 * como siempre. Con algún día distinto (hora propia, aviso propio o apagado) es una alarma SEMANAL por día y
 * antelación, a la hora de ese día: la diaria ignoraba la hora de cada día (E-640).
 *
 * @param horaHHmm hora GENERAL del hábito, `HH:mm`.
 * @param antelaciones el aviso general: cuántos minutos antes avisar, uno por aviso. `0` = a la hora exacta;
 *                     vacío = sin aviso. Los días con aviso propio usan el suyo.
 */
export async function programar(
  userId: string,
  habitoId: string,
  titulo: string,
  horaHHmm: string,
  antelaciones: number[],
  opciones: OpcionesDelAviso & { ahora?: Date } = {},
): Promise<boolean> {
  const ahora = opciones.ahora ?? new Date();
  // Spec 009: «cómo suena» la general. Se lee ANTES de `cancelar`, que borra lo que el teléfono recordaba del hábito.
  const alarma = opciones.alarma !== undefined ? opciones.alarma : await combinacionGeneralGuardada(userId, habitoId);
  // Spec 028: y las fechas propias que el teléfono ya tenía, si quien llama no sabe de ellas (también antes de `cancelar`).
  const fechas = opciones.fechas !== undefined ? opciones.fechas : await fechasGuardadas(userId, habitoId);
  const opcionesConAlarma: OpcionesDelAviso = { ...opciones, alarma, fechas };
  const plan = planDeAlarmas({
    habitoId, horaGeneral: horaCorta(horaHHmm), avisosGenerales: antelaciones, dias: opciones.dias, alarmaGeneral: alarma,
    fechas, ahora,
  });
  const sinAvisos = plan.esquema === 'porDia' ? plan.pedidos.length === 0 : antelaciones.length === 0;
  if (HAY_RECORDATORIOS_WEB) {
    // Web no tiene scheduler local: la suscripción se registra una vez y los dos avisos los
    // despacha el backend para esta persona. Con antelaciones vacías no hay nada que habilitar.
    if (sinAvisos) return true;
    return registrarSuscripcionWebPush();
  }
  const N = notificaciones();
  if (!N) return false;
  const [h, m] = horaHHmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;

  // Cancela TODAS las anteriores antes de programar: sin esto, cambiar de "10 min" a "30 min"
  // dejaría las dos sonando, y cada guardado sumaría una más.
  await cancelar(userId, habitoId);
  const claveSet = CLAVE_ANTELACIONES + `${userId}.${habitoId}`;
  if (sinAvisos) {
    // Por día y sin ninguna alarma (todos apagados, o sin aviso): el aviso general se recuerda igual.
    if (antelaciones.length === 0) await sinRomper(() => AsyncStorage.removeItem(claveSet), undefined);
    else await sinRomper(() => AsyncStorage.setItem(claveSet, JSON.stringify(antelaciones)), undefined);
    return true;
  }
  const ok = await sinRomper(async () => {
    if (!(await pedirPermiso())) return false;
    // Issue #33: un hábito ya cumplido hoy no suena el resto del día (el esquema que se repite no sabe saltarse un día).
    const entradaDelPuente: EntradaDeRepeticiones = {
      habitoId, horaGeneral: horaCorta(horaHHmm), avisosGenerales: antelaciones, dias: opciones.dias, alarmaGeneral: alarma,
      fechas,
    };
    if (await ponerElPuenteSiHoyYaSeCumplio(
      N, userId, habitoId, titulo, entradaDelPuente, antelaciones, { hora: horaHHmm }, opcionesConAlarma, plan, ahora,
    )) {
      return true;
    }
    if (plan.esquema === 'porDia') {
      return ponerLasAlarmasPorDia(N, userId, habitoId, titulo, plan.pedidos, antelaciones, { hora: horaHHmm }, opcionesConAlarma);
    }
    // Con el hábito: con «Voz», uno del catálogo dice su nombre y sale por su propio canal. Spec 009: y el canal
    // sale de «cómo suena» (sin vibración, solo vibrar, voz).
    const canal = await canalDeLaAlarma(userId, habitoId, titulo, alarma);
    await asegurarCanal(canal);
    const ids: string[] = [];
    // De la más temprana a la más tardía, que es el orden en que van a sonar.
    for (const [i, minutosAntes] of [...antelaciones].sort((a, b) => b - a).entries()) {
      // Restar puede cruzar la medianoche (07:00 con 90 de antelación son las 05:30 del mismo día;
      // 00:30 con 45 son las 23:45 del anterior). El módulo se normaliza para que nunca quede
      // negativo, que es el caso en que `DAILY` recibiría una hora inválida.
      const minutos = ((h * 60 + m - minutosAntes) % MINUTOS_POR_DIA + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
      const id = await N.scheduleNotificationAsync({
        // Solo la primera (la antelación más temprana, la que conoce el servidor) comparte identidad con su
        // push de respaldo (spec 007, FR-014). Va por posición y no por valor: con una antelación repetida,
        // dos pedidos con el mismo identificador se reemplazarían entre sí. Programar de nuevo el mismo
        // hábito reemplaza la alarma (mismo identificador, mismo `PendingIntent`), no la duplica.
        ...(i === 0 ? { identifier: identificadorDelAvisoDeInicio(habitoId) } : {}),
        content: contenidoDelAviso(titulo, minutosAntes, horaHHmm, canal, rutaDelAvisoDeHabito(habitoId, opciones.dimension), alarma),
        trigger: {
          type: N.SchedulableTriggerInputTypes.DAILY,
          hour: Math.floor(minutos / 60),
          minute: minutos % 60,
          channelId: canal.id,
        },
      });
      ids.push(id);
    }
    await AsyncStorage.setItem(claveDe(userId, habitoId), JSON.stringify(ids));
    await AsyncStorage.setItem(claveSet, JSON.stringify(antelaciones));
    await AsyncStorage.setItem(claveHora(userId, habitoId), JSON.stringify({ hora: horaHHmm }));
    await guardarCombinacionGeneral(userId, habitoId, alarma);
    return true;
  }, false);
  if (ok) {
    await sincronizarLasRepeticiones(userId, habitoId, titulo, {
      horaGeneral: horaHHmm, avisosGenerales: antelaciones, dias: opciones.dias, fechas, alarmaGeneral: alarma,
      dimension: opciones.dimension,
    });
    await reagrupar(userId);
  }
  return ok;
}

/**
 * Mueve la alarma de un hábito a su hora nueva, **si este teléfono tenía una**.
 *
 * El bug que cierra (2026-09-26): cambiar la hora de un hábito desde `PlanScreen` guardaba la hora en
 * el servidor pero no tocaba la alarma del teléfono, que seguía sonando a la hora vieja todos los
 * días. La hoja de Training (`PlanificarDimensionModal`) sí reprogramaba; Plan no.
 *
 * Se reprograma con las MISMAS antelaciones que ya tenía, que viven en este teléfono. Si no hay
 * ninguna guardada, no se inventa una alarma: la persona nunca la pidió aquí.
 *
 * Devuelve `null` si no había nada que mover (o en web, donde el aviso lo manda el servidor con la
 * hora nueva), y si no, lo que devolvió `programar`.
 */
/**
 * Los días recordados para reprogramar, SIN la hora que el servidor había resuelto para cada uno (E-642). Quien cambia
 * la hora general sin leer el servidor (Plan, Yo → Alarmas) no tiene las horas resueltas de ahora: las que se
 * recordaban son de antes del cambio, y un día sin hora propia tiene que seguir a la general nueva.
 */
function sinHorasResueltas(dias: readonly DiaPropio[] | null): DiaPropio[] | null {
  return dias ? dias.map(({ horaResuelta: _recordada, ...resto }) => resto) : null;
}

export async function reprogramarTrasCambioDeHora(
  userId: string,
  habitoId: string,
  titulo: string,
  horaHHmm: string,
  dimension?: string | null,
): Promise<boolean | null> {
  if (!HAY_RECORDATORIOS_LOCALES) return null;
  const antelaciones = await antelacionesDe(userId, habitoId);
  // Spec 008: si el hábito tenía alarmas por día, se vuelven a armar con lo propio de cada día (un día con hora
  // propia no se mueve con la general). Sin días, o sin ninguna alarma, es lo de siempre.
  const recordado = await esquemaGuardado(userId, habitoId);
  const dias = sinHorasResueltas(recordado?.dias ?? null);
  // Spec 028: y las fechas propias que tenía, para que cambiar la hora general no le devuelva el sábado a la hora de siempre.
  const fechas = recordado?.fechas ?? null;
  if (sinNingunAviso(habitoId, horaHHmm, antelaciones, dias, fechas)) return null;
  return programar(userId, habitoId, titulo, horaHHmm, antelaciones, { dimension, dias, fechas });
}

/** `true` si con estos avisos generales y estos días el hábito no tendría ninguna alarma que mover. */
function sinNingunAviso(
  habitoId: string,
  horaGeneral: string,
  antelaciones: readonly number[],
  dias: readonly DiaPropio[] | null,
  fechas?: readonly FechaPropia[] | null,
): boolean {
  const plan = planDeAlarmas({ habitoId, horaGeneral: horaCorta(horaGeneral), avisosGenerales: antelaciones, dias, fechas });
  return plan.esquema === 'porDia' ? plan.pedidos.length === 0 : antelaciones.length === 0;
}

/**
 * Como `reprogramarTrasCambioDeHora`, pero con un cambio que el servidor difirió (D-91): hoy sigue la
 * hora vieja y la nueva empieza en su fecha (D-217). `null` si este teléfono no tenía alarma.
 */
export async function reprogramarTrasCambioDiferido(
  userId: string,
  habitoId: string,
  titulo: string,
  cambio: CambioDiferido,
  dimension?: string | null,
  ahora?: Date,
): Promise<boolean | null> {
  if (!HAY_RECORDATORIOS_LOCALES) return null;
  const antelaciones = await antelacionesDe(userId, habitoId);
  const recordado = await esquemaGuardado(userId, habitoId);
  const dias = sinHorasResueltas(recordado?.dias ?? null);
  const fechas = recordado?.fechas ?? null;
  if (sinNingunAviso(habitoId, cambio.horaNueva, antelaciones, dias, fechas)) return null;
  return programarConCambioDiferido(userId, habitoId, titulo, cambio, antelaciones, { dimension, ahora, dias, fechas });
}

/** `true` si esta persona tiene puesto el repaso semanal en ESTE teléfono. */
export async function tieneRepasoSemanal(userId: string): Promise<boolean> {
  if (!HAY_RECORDATORIOS) return false;
  return sinRomper(async () => (await AsyncStorage.getItem(CLAVE_REPASO + userId)) !== null, false);
}

/**
 * El aviso de los domingos para armar la semana.
 *
 * Es del PROGRAMA y no de un hábito: uno solo por persona, con su propio texto y su propio
 * disparador. Por eso no vive en la hoja de un hábito ni se multiplica por dimensión.
 *
 * Devuelve `false` si no se pudo (sin permiso, web o Expo Go).
 */
export async function programarRepasoSemanal(userId: string): Promise<boolean> {
  const N = notificaciones();
  if (!N) return false;
  await cancelarRepasoSemanal(userId);
  return sinRomper(async () => {
    if (!(await pedirPermiso())) return false;
    await asegurarCanal();
    const id = await N.scheduleNotificationAsync({
      content: {
        title: 'Arma tu semana',
        body: 'Revisa a qué hora va cada hábito de lunes a domingo. Lo que dejes hoy rige desde mañana.',
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.WEEKLY,
        weekday: DOMINGO_EN_EXPO,
        hour: HORA_REPASO,
        minute: MINUTO_REPASO,
        channelId: CANAL_ANDROID.id,
      },
    });
    await AsyncStorage.setItem(CLAVE_REPASO + userId, id);
    return true;
  }, false);
}

/** Quita el aviso de los domingos. Idempotente. */
export async function cancelarRepasoSemanal(userId: string): Promise<void> {
  const N = notificaciones();
  if (!N) return;
  await sinRomper(async () => {
    const id = await AsyncStorage.getItem(CLAVE_REPASO + userId);
    if (!id) return;
    // `REPASO_SIN_ALARMA` (tras cerrar sesión, E-413) no tiene alarma que cancelar; apagarlo lo borra igual.
    if (id !== REPASO_SIN_ALARMA) await N.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(CLAVE_REPASO + userId);
  }, undefined);
}

/* ------------------------------------------------------------------------------------------------
 * El cambio de hora que rige desde mañana (D-91), también en la alarma — D-217, 2026-09-28
 * ---------------------------------------------------------------------------------------------- */

/**
 * Un cambio de hora que el servidor difirió: hoy sigue `horaDeHoy`, y desde `desde` (`YYYY-MM-DD`, el
 * `deferredEffectiveDate` del PATCH) rige `horaNueva`.
 */
export interface CambioDiferido {
  horaDeHoy: string;
  horaNueva: string;
  desde: string;
}

/** Una alarma de fecha que espera ser la primera de la diaria nueva. */
interface Pendiente {
  antes: number;
  instanteMs: number;
  id: string;
}

interface RegistroDiferido {
  titulo: string;
  horaNueva: string;
  dimension: string | null;
  pendientes: Pendiente[];
}

const PREFIJO_DIFERIDO = 'renaser.habitos.diferido.';

function claveDiferido(userId: string, habitoId: string): string {
  return `${PREFIJO_DIFERIDO}${userId}.${habitoId}`;
}

const esHoraHHmm = (x: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(x);

/** La fecha local (del teléfono) de un instante, `YYYY-MM-DD`. */
function fechaLocal(d: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** El instante local de `fecha` a `hora`, menos la antelación (puede caer el día anterior). */
function instanteDelAviso(fecha: string, horaHHmm: string, minutosAntes: number): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  const [h, mi] = horaHHmm.split(':').map(Number);
  return new Date(a, m - 1, d, h, mi - minutosAntes, 0, 0);
}

/** Cuándo sonaría por primera vez una alarma diaria de `hora:minuto` programada en `ahora`. */
function primeraDeUnaDiaria(ahora: Date, hora: number, minuto: number): Date {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hora, minuto, 0, 0);
  if (hoy.getTime() <= ahora.getTime()) hoy.setDate(hoy.getDate() + 1);
  return hoy;
}

/**
 * Programa un hábito cuyo cambio de hora rige desde `cambio.desde` (D-91 en el servidor; D-217 en la
 * alarma).
 *
 * ## El bug que cierra
 *
 * `programar` mueve la alarma DIARIA en el acto, y una diaria no sabe «desde mañana»: si a las 06:00 se
 * pasaba un hábito de las 07:00 a las 10:00, hoy no sonaba a las 07:00 (la de hoy según el servidor) y
 * sí a las 10:00 (que para el servidor todavía no rige).
 *
 * ## Cómo
 *
 * - **Hoy, a la hora vieja**: una alarma de FECHA por antelación, si todavía no pasó.
 * - **Desde la fecha, a la hora nueva**: si la diaria programada ahora ya sonaría por primera vez ese día
 *   o después (la hora nueva ya pasó hoy), se programa la diaria de una. Si sonaría antes —hoy mismo—,
 *   va una alarma de FECHA para el primer día y se anota como pendiente; `completarCambiosDiferidos` la
 *   convierte en la diaria la primera vez que la app se abra cuando ya no puede adelantarse. Si la app
 *   no se abre, suena ese primer día igual, y de ahí en adelante cubre el push del servidor (D-217): ese
 *   teléfono dejó de confirmar sus alarmas.
 *
 * Todas las ids quedan bajo la misma clave del hábito, así que `cancelar` las quita todas.
 */
export async function programarConCambioDiferido(
  userId: string,
  habitoId: string,
  titulo: string,
  cambio: CambioDiferido,
  antelaciones: number[],
  opciones: OpcionesDelAviso & { ahora?: Date } = {},
): Promise<boolean> {
  const ahora = opciones.ahora ?? new Date();
  // Spec 009: «cómo suena» la general; se lee antes de `cancelar` (ver `programar`).
  const alarma = opciones.alarma !== undefined ? opciones.alarma : await combinacionGeneralGuardada(userId, habitoId);
  const fechas = opciones.fechas !== undefined ? opciones.fechas : await fechasGuardadas(userId, habitoId);
  const opcionesConAlarma = { ...opciones, alarma, fechas };
  // Spec 008: con algún día distinto, el hábito va por día (alarmas semanales); los días que siguen la hora
  // general esperan la fecha del cambio con una alarma de fecha cada uno (`planDeAlarmas`).
  const plan = planDeAlarmas({
    habitoId, horaGeneral: horaCorta(cambio.horaNueva), avisosGenerales: antelaciones, dias: opciones.dias, cambio, ahora,
    alarmaGeneral: alarma, fechas,
  });
  const sinAvisos = plan.esquema === 'porDia' ? plan.pedidos.length === 0 : antelaciones.length === 0;
  if (HAY_RECORDATORIOS_WEB) return sinAvisos ? true : registrarSuscripcionWebPush();
  const N = notificaciones();
  if (!N || !esHoraHHmm(cambio.horaDeHoy) || !esHoraHHmm(cambio.horaNueva)) return false;
  await cancelar(userId, habitoId);
  const claveSet = CLAVE_ANTELACIONES + `${userId}.${habitoId}`;
  if (sinAvisos) {
    if (antelaciones.length === 0) await sinRomper(() => AsyncStorage.removeItem(claveSet), undefined);
    else await sinRomper(() => AsyncStorage.setItem(claveSet, JSON.stringify(antelaciones)), undefined);
    return true;
  }
  // Issue #33: la misma entrada que el plan, para el puente de un hábito ya cumplido hoy.
  const entradaDelPuente: EntradaDeRepeticiones = {
    habitoId, horaGeneral: horaCorta(cambio.horaNueva), avisosGenerales: antelaciones, dias: opciones.dias, alarmaGeneral: alarma, cambio,
    fechas,
  };
  if (plan.esquema === 'porDia') {
    const hecho = await sinRomper(async () => {
      if (!(await pedirPermiso())) return false;
      if (await ponerElPuenteSiHoyYaSeCumplio(
        N, userId, habitoId, titulo, entradaDelPuente, antelaciones, { hora: cambio.horaNueva, desde: cambio.desde }, opcionesConAlarma, plan, ahora,
      )) {
        return true;
      }
      return ponerLasAlarmasPorDia(N, userId, habitoId, titulo, plan.pedidos, antelaciones,
        { hora: cambio.horaNueva, desde: cambio.desde }, opcionesConAlarma);
    }, false);
    if (hecho) {
      await sincronizarLasRepeticiones(userId, habitoId, titulo, {
        horaGeneral: cambio.horaNueva, avisosGenerales: antelaciones, dias: opciones.dias, fechas,
        alarmaGeneral: alarma, cambio, dimension: opciones.dimension,
      });
      await reagrupar(userId);
    }
    return hecho;
  }
  const ruta = rutaDelAvisoDeHabito(habitoId, opciones.dimension);
  const ok = await sinRomper(async () => {
    if (!(await pedirPermiso())) return false;
    if (await ponerElPuenteSiHoyYaSeCumplio(
      N, userId, habitoId, titulo, entradaDelPuente, antelaciones, { hora: cambio.horaNueva, desde: cambio.desde }, opcionesConAlarma, plan, ahora,
    )) {
      return true;
    }
    const canal = await canalDeLaAlarma(userId, habitoId, titulo, alarma);
    await asegurarCanal(canal);
    const ids: string[] = [];
    const pendientes: Pendiente[] = [];
    const hoy = fechaLocal(ahora);
    for (const antes of [...antelaciones].sort((a, b) => b - a)) {
      const deHoy = instanteDelAviso(hoy, cambio.horaDeHoy, antes);
      if (hoy < cambio.desde && deHoy.getTime() > ahora.getTime()) {
        ids.push(await N.scheduleNotificationAsync({
          content: contenidoDelAviso(titulo, antes, cambio.horaDeHoy, canal, ruta, alarma),
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: deHoy, channelId: canal.id },
        }));
      }
      const primera = instanteDelAviso(cambio.desde, cambio.horaNueva, antes);
      const hora = primera.getHours();
      const minuto = primera.getMinutes();
      const contenido = contenidoDelAviso(titulo, antes, cambio.horaNueva, canal, ruta, alarma);
      if (primeraDeUnaDiaria(ahora, hora, minuto).getTime() >= primera.getTime()) {
        ids.push(await N.scheduleNotificationAsync({
          content: contenido,
          trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: hora, minute: minuto, channelId: canal.id },
        }));
      } else {
        const id = await N.scheduleNotificationAsync({
          content: contenido,
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: primera, channelId: canal.id },
        });
        ids.push(id);
        pendientes.push({ antes, instanteMs: primera.getTime(), id });
      }
    }
    await AsyncStorage.setItem(claveDe(userId, habitoId), JSON.stringify(ids));
    await AsyncStorage.setItem(claveSet, JSON.stringify(antelaciones));
    await AsyncStorage.setItem(claveHora(userId, habitoId), JSON.stringify({ hora: cambio.horaNueva, desde: cambio.desde }));
    await guardarCombinacionGeneral(userId, habitoId, alarma);
    if (pendientes.length > 0) {
      const registro: RegistroDiferido = { titulo, horaNueva: cambio.horaNueva, dimension: opciones.dimension ?? null, pendientes };
      await AsyncStorage.setItem(claveDiferido(userId, habitoId), JSON.stringify(registro));
    }
    return true;
  }, false);
  if (ok) {
    await sincronizarLasRepeticiones(userId, habitoId, titulo, {
      horaGeneral: cambio.horaNueva, avisosGenerales: antelaciones, dias: opciones.dias, fechas,
      alarmaGeneral: alarma, cambio, dimension: opciones.dimension,
    });
    await reagrupar(userId);
  }
  return ok;
}

/**
 * Convierte en diaria cada alarma de fecha que esperaba el primer día de una hora nueva, en cuanto la
 * diaria ya no puede sonar antes de ese día. Idempotente; corre al abrir la app. Devuelve cuántas
 * convirtió.
 */
export async function completarCambiosDiferidos(userId: string, ahora: Date = new Date()): Promise<number> {
  const N = notificaciones();
  if (!N) return 0;
  return sinRomper(async () => {
    const prefijo = `${PREFIJO_DIFERIDO}${userId}.`;
    const claves = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefijo));
    let convertidas = 0;
    for (const clave of claves) {
      convertidas += await completarUno(N, userId, clave.slice(prefijo.length), ahora);
    }
    if (convertidas > 0) await reagrupar(userId);
    return convertidas;
  }, 0);
}

async function completarUno(
  N: typeof TipoNotificaciones,
  userId: string,
  habitoId: string,
  ahora: Date,
): Promise<number> {
  const crudo = await AsyncStorage.getItem(claveDiferido(userId, habitoId));
  if (!crudo) return 0;
  const registro = JSON.parse(crudo) as RegistroDiferido;
  const ids = leerIds((await AsyncStorage.getItem(claveDe(userId, habitoId))) ?? '[]');
  const alarma = await combinacionGeneralGuardada(userId, habitoId);
  const canal = await canalDeLaAlarma(userId, habitoId, registro.titulo, alarma);
  const quedan: Pendiente[] = [];
  let convertidas = 0;
  for (const p of registro.pendientes) {
    const primera = new Date(p.instanteMs);
    if (primeraDeUnaDiaria(ahora, primera.getHours(), primera.getMinutes()).getTime() < p.instanteMs) {
      quedan.push(p);
      continue;
    }
    await N.cancelScheduledNotificationAsync(p.id).catch(() => {});
    await asegurarCanal(canal);
    const nueva = await N.scheduleNotificationAsync({
      content: contenidoDelAviso(registro.titulo, p.antes, registro.horaNueva, canal,
        rutaDelAvisoDeHabito(habitoId, registro.dimension), alarma),
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: primera.getHours(),
        minute: primera.getMinutes(),
        channelId: canal.id,
      },
    });
    const i = ids.indexOf(p.id);
    if (i >= 0) ids[i] = nueva;
    else ids.push(nueva);
    convertidas++;
  }
  await AsyncStorage.setItem(claveDe(userId, habitoId), JSON.stringify(ids));
  if (quedan.length === 0) await AsyncStorage.removeItem(claveDiferido(userId, habitoId));
  else await AsyncStorage.setItem(claveDiferido(userId, habitoId), JSON.stringify({ ...registro, pendientes: quedan }));
  return convertidas;
}

/* ------------------------------------------------------------------------------------------------
 * Ponerse al día con el servidor: teléfono nuevo, reinstalación, o cambios desde otro dispositivo
 * (D-217, 2026-09-28)
 * ---------------------------------------------------------------------------------------------- */

const mismoConjunto = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && [...a].sort((x, y) => x - y).every((x, i) => x === [...b].sort((m, n) => m - n)[i]);

/**
 * Qué avisos tiene que tener este hábito según el servidor. Con el conjunto (V81) manda el conjunto. Sin
 * él (guardado antes de V81 o por el APK viejo) el servidor solo sabe el más temprano: si coincide con el
 * más temprano del teléfono, se conservan los del teléfono («30 min y a la hora» no se achica a «30 min»).
 */
export function avisosSegunElServidor(p: PreferenciaHabitoApi, delTelefono: readonly number[]): number[] {
  if (p.reminderMinutesList && p.reminderMinutesList.length > 0) return [...p.reminderMinutesList];
  const minutos = p.reminderMinutesBefore as number;
  if (delTelefono.length > 0 && Math.max(...delTelefono) === minutos) return [...delTelefono];
  return [minutos];
}

/**
 * Deja las alarmas de hábitos de este teléfono como dice el servidor. Devuelve cuántos hábitos tocó.
 *
 * ## Los bugs que cierra
 *
 * - **Teléfono nuevo o reinstalación (E-398):** las antelaciones y las ids vivían solo en AsyncStorage; el
 *   servidor decía «recordatorio activo» y el teléfono no tenía alarma.
 * - **Cambios desde otro dispositivo (dueño, 28/09):** apagar el recordatorio o cambiar la hora o los
 *   avisos en otro teléfono o en la web no tocaba la alarma de este.
 *
 * ## Qué hace
 *
 * - `reminderEnabled === false` y el teléfono tiene alarma → la cancela.
 * - Activo (con minutos y hora) y sin alarma → la arma con `avisosSegunElServidor`.
 * - Activo y con alarma → la reprograma si cambiaron los avisos, la hora o el cambio pendiente. La hora
 *   solo se compara si el teléfono la anotó (las alarmas de antes de D-217 no la tienen).
 * - Con cambio pendiente, respetando su fecha.
 * - **Issue #33 (2026-10-27): el puente de un hábito cumplido.** Un hábito que se cumplió hoy y todavía tiene avisos por
 *   sonar lleva alarmas de fecha desde mañana en lugar de las que se repiten (`ponerElPuenteSiHoyYaSeCumplio`). Esta
 *   puesta al día lo compara con lo que corresponde (`hayQueConciliarElPuente`) y lo arma, lo deja o vuelve al esquema
 *   normal —cuando el día pasó, o ya sonaron todos los avisos de hoy—, aunque nada más haya cambiado. Converge: no se
 *   rehace en cada apertura mientras esté como debe.
 * - **Spec 028 (2026-10-31): las fechas propias.** Un hábito con alguna fecha con cambio «solo esta semana» vigente (`dateOverrides`)
 *   va por día y sus días afectados llevan alarmas de fecha en lugar de las semanales. Esta puesta al día lo arma, lo deja si la
 *   firma coincide y lo revierte solo —al esquema diario o al semanal de siempre— cuando ya no queda ninguna vigente.
 * - **No pide permiso**: corre al abrir la app. Sin permiso de avisos no arma nada (sí cancela).
 */
export async function ajustarRecordatoriosAlServidor(
  userId: string,
  preferencias: ReadonlyArray<PreferenciaHabitoApi>,
  opciones: { ahora?: Date; dimensionDe?: (habitoId: string) => string | null } = {},
): Promise<number> {
  const N = notificaciones();
  if (!N) return 0;
  const permiso = await sinRomper(async () => (await N.getPermissionsAsync()).granted, false);
  const conAlarma = await recordatoriosPorHabito(userId);
  let tocados = 0;
  for (const p of preferencias) {
    const tieneAlarma = (conAlarma.get(p.habitId)?.length ?? 0) > 0;
    // Spec 008: un hábito con algún día distinto va por día. Se decide ANTES del aviso general, porque un día
    // puede tener aviso propio aunque el general esté apagado.
    // Spec 028: y también el que tiene alguna fecha con cambio «solo esta semana» todavía vigente. Cuando la última pasa, ya no
    // entra acá y cae en `ajustarUno` (que ve que venía por día y lo deja diario), igual que cuando desaparecen los días distintos.
    const dias = diasPropiosDe(p.weekdays);
    const fechas = fechasPropiasDe(p.dateOverrides);
    if (usaEsquemaPorDia(dias) || hayFechasVigentes(fechas, opciones.ahora ?? new Date())) {
      if (await ajustarPorDia(userId, p, dias ?? [], fechas, tieneAlarma, permiso, opciones)) tocados++;
      continue;
    }
    // Venía por día y ya no hay ningún día distinto: aunque los avisos y la hora coincidan, las alarmas
    // semanales se rehacen como diarias.
    const veniaPorDia = (await esquemaGuardado(userId, p.habitId)) !== null;
    if (p.reminderEnabled === false) {
      if (tieneAlarma) {
        await cancelar(userId, p.habitId);
        await sinRomper(() => AsyncStorage.removeItem(CLAVE_ANTELACIONES + `${userId}.${p.habitId}`), undefined);
        tocados++;
      }
      continue;
    }
    if (!permiso || p.reminderEnabled !== true || p.reminderMinutesBefore == null || !p.triggerTime) continue;
    if (await ajustarUno(userId, p, tieneAlarma, veniaPorDia, opciones)) tocados++;
  }
  // Spec 009: la ventana de 7 días de las repeticiones se renueva en cada puesta al día, con lo que dice el servidor.
  await renovarLasRepeticiones(userId, preferencias, permiso, opciones);
  return tocados;
}

/**
 * Spec 009 («Repetir si no la atiendo»): deja las repeticiones de todos los hábitos como las pide el servidor —las
 * de hoy y los 6 días siguientes—, salvo las de un día que la persona ya atendió. Es la renovación de la ventana:
 * sin ella, las repeticiones se acabarían a los 7 días de programarlas. Corre después de armar las alarmas
 * principales y no pide permiso: sin él, solo quita las que hubiera.
 */
async function renovarLasRepeticiones(
  userId: string,
  preferencias: ReadonlyArray<PreferenciaHabitoApi>,
  permiso: boolean,
  opciones: { ahora?: Date; dimensionDe?: (habitoId: string) => string | null },
): Promise<void> {
  await sinRomper(async () => {
    const N = notificaciones();
    if (!N) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sincronizarRepeticiones } = require('./repeticiones') as typeof import('./repeticiones');
    // Una sola lectura de lo programado para todos los hábitos: cada uno mira solo sus propias repeticiones.
    const programadas = (await N.getAllScheduledNotificationsAsync?.()) as unknown;
    const lista = Array.isArray(programadas) ? programadas : [];
    for (const p of preferencias) {
      const hora = horaCorta(p.triggerTime);
      const generalActivo = p.reminderEnabled === true && p.reminderMinutesBefore != null;
      const avisosGenerales = generalActivo ? avisosSegunElServidor(p, await antelacionesDe(userId, p.habitId)) : [];
      const horaNueva = horaCorta(p.pendingChange?.triggerTime);
      const cambio = hora && horaNueva && p.pendingChange?.effectiveDate
        ? { horaDeHoy: hora, horaNueva, desde: p.pendingChange.effectiveDate }
        : null;
      await sincronizarRepeticiones(userId, {
        habitoId: p.habitId,
        titulo: p.title,
        dimension: opciones.dimensionDe?.(p.habitId) ?? null,
        horaGeneral: hora,
        avisosGenerales,
        dias: diasPropiosDe(p.weekdays),
        fechas: fechasPropiasDe(p.dateOverrides),
        alarmaGeneral: combinacionDeLaApi(p.alarm) ?? (await combinacionGeneralGuardada(userId, p.habitId)),
        cambio,
        permiso,
      }, { ahora: opciones.ahora, programadas: lista });
    }
  }, undefined);
}

async function ajustarUno(
  userId: string,
  p: PreferenciaHabitoApi,
  tieneAlarma: boolean,
  veniaPorDia: boolean,
  opciones: { ahora?: Date; dimensionDe?: (habitoId: string) => string | null },
): Promise<boolean> {
  const delTelefono = await antelacionesDe(userId, p.habitId);
  const avisos = avisosSegunElServidor(p, delTelefono);
  const hora = (p.triggerTime as string).slice(0, 5);
  const cambio = p.pendingChange?.triggerTime && p.pendingChange.effectiveDate
    ? { horaNueva: p.pendingChange.triggerTime.slice(0, 5), desde: p.pendingChange.effectiveDate }
    : null;
  // Spec 009: «cómo suena» según el servidor (`null` si el backend no la manda: ahí se conserva la del teléfono).
  const alarmaDelServidor = combinacionDeLaApi(p.alarm);
  if (tieneAlarma) {
    const anotada = await horaProgramada(userId, p.habitId);
    const horaCambio = anotada !== null && (cambio
      ? anotada.hora !== cambio.horaNueva || anotada.desde !== cambio.desde
      : anotada.hora !== hora);
    const cambioElSonido = alarmaDelServidor !== null
      && !mismaCombinacion(alarmaDelServidor, (await combinacionGeneralGuardada(userId, p.habitId)) ?? COMBINACION_POR_DEFECTO);
    // Issue #33: un hábito cumplido hoy tiene su puente armado (o debería); si no está como corresponde, se rehacen.
    const hayQueConciliar = await hayQueConciliarElPuente(userId, {
      habitoId: p.habitId,
      horaGeneral: hora,
      avisosGenerales: avisos,
      dias: null,
      alarmaGeneral: alarmaDelServidor ?? (await combinacionGeneralGuardada(userId, p.habitId)),
      cambio: cambio ? { horaDeHoy: hora, horaNueva: cambio.horaNueva, desde: cambio.desde } : null,
    }, opciones.ahora ?? new Date());
    if (mismoConjunto(avisos, delTelefono) && !horaCambio && !veniaPorDia && !cambioElSonido && !hayQueConciliar) return false;
  }
  const dimension = opciones.dimensionDe?.(p.habitId) ?? null;
  const alarma = alarmaDelServidor ?? undefined;
  // Spec 028: acá el servidor no manda ninguna fecha propia vigente (si no, el hábito iría por `ajustarPorDia`): `fechas: []` y no
  // «las que el teléfono recordaba», que pueden ser de un cambio que ya se deshizo.
  return cambio
    ? programarConCambioDiferido(userId, p.habitId, p.title,
      { horaDeHoy: hora, horaNueva: cambio.horaNueva, desde: cambio.desde }, avisos, { dimension, ahora: opciones.ahora, alarma, fechas: [] })
    : programar(userId, p.habitId, p.title, hora, avisos, { dimension, alarma, ahora: opciones.ahora, fechas: [] });
}

/**
 * El hábito con algún día distinto (spec 008): deja las alarmas del teléfono como las del plan por día, y no
 * toca la librería si ya lo están (la firma del plan guardada coincide). Corre al abrir la app: no pide permiso.
 *
 * - El aviso general sale del servidor como siempre (`avisosSegunElServidor`); si está apagado, queda vacío y
 *   solo suenan los días con aviso propio.
 * - Sin hora general el hábito no tiene recordatorio (ni general ni por día): no se toca.
 * - Con un cambio de hora general pendiente (D-91), los días que siguen la general esperan su fecha.
 * - Sin ninguna alarma que poner (todos apagados, o todos sin aviso), cancela las que hubiera.
 */
async function ajustarPorDia(
  userId: string,
  p: PreferenciaHabitoApi,
  dias: readonly DiaPropio[],
  fechas: readonly FechaPropia[],
  tieneAlarma: boolean,
  permiso: boolean,
  opciones: { ahora?: Date; dimensionDe?: (habitoId: string) => string | null },
): Promise<boolean> {
  const hora = horaCorta(p.triggerTime);
  if (!hora) return false;
  const delTelefono = await antelacionesDe(userId, p.habitId);
  const generalActivo = p.reminderEnabled === true && p.reminderMinutesBefore != null;
  const avisosGenerales = generalActivo ? avisosSegunElServidor(p, delTelefono) : [];
  const horaNueva = horaCorta(p.pendingChange?.triggerTime);
  const cambio = horaNueva && p.pendingChange?.effectiveDate
    ? { horaDeHoy: hora, horaNueva, desde: p.pendingChange.effectiveDate }
    : null;
  // Spec 009: la general según el servidor; sin ella (backend anterior), la que este teléfono ya tenía.
  const alarmaGeneral = combinacionDeLaApi(p.alarm) ?? (await combinacionGeneralGuardada(userId, p.habitId));
  const plan = planDeAlarmas({
    habitoId: p.habitId, horaGeneral: hora, avisosGenerales, dias, fechas, cambio, ahora: opciones.ahora, alarmaGeneral,
  });
  const pedidos = plan.esquema === 'porDia' ? plan.pedidos : [];
  if (pedidos.length === 0) {
    if (!tieneAlarma) return false;
    await cancelar(userId, p.habitId);
    if (avisosGenerales.length === 0) {
      await sinRomper(() => AsyncStorage.removeItem(CLAVE_ANTELACIONES + `${userId}.${p.habitId}`), undefined);
    }
    return true;
  }
  if (!permiso) return false;
  if (tieneAlarma && (await esquemaGuardado(userId, p.habitId))?.firma === firmaDelPlan(plan)) {
    // Issue #33: aunque las alarmas sean las que corresponden, el puente de un hábito cumplido hoy puede no estarlo.
    const hayQueConciliar = await hayQueConciliarElPuente(userId, {
      habitoId: p.habitId, horaGeneral: hora, avisosGenerales, dias, fechas, alarmaGeneral, cambio,
    }, opciones.ahora ?? new Date());
    if (!hayQueConciliar) return false;
  }
  const dimension = opciones.dimensionDe?.(p.habitId) ?? null;
  return cambio
    ? programarConCambioDiferido(userId, p.habitId, p.title, cambio, avisosGenerales, {
      dimension, ahora: opciones.ahora, dias, fechas, alarma: alarmaGeneral,
    })
    : programar(userId, p.habitId, p.title, hora, avisosGenerales, { dimension, dias, fechas, alarma: alarmaGeneral, ahora: opciones.ahora });
}
