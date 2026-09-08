import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { registrarSuscripcionWebPush } from './webPush';
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
 * ## POR QUÉ SE GUARDA EL IDENTIFICADOR
 *
 * `scheduleNotificationAsync` devuelve un id y esa es la ÚNICA forma de cancelar esa alarma
 * después. Sin guardarlo, cambiar la hora de un hábito dejaría la alarma vieja sonando para
 * siempre y sumaría una nueva cada vez. Se guarda por usuario y por hábito.
 */

const PREFIJO_CLAVE = 'renaser.habitos.recordatorio.';

/** El repaso semanal es UNO por persona, no uno por hábito: clave aparte. */
const CLAVE_REPASO = 'renaser.habitos.repasoSemanal.';

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

/** Canal de Android. Sin uno propio, el sistema agrupa estos avisos con cualquier otro. */
const CANAL_ANDROID = 'recordatorios-habitos';

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
function notificaciones(): typeof TipoNotificaciones | null {
  if (!HAY_RECORDATORIOS_LOCALES) return null;
  if (modulo === null) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    modulo = require('expo-notifications') as typeof TipoNotificaciones;
    modulo.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return modulo;
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

/** El canal de Android tiene que existir antes de programar contra él. Idempotente. */
async function asegurarCanal(): Promise<void> {
  const N = notificaciones();
  if (!N || Platform.OS !== 'android') return;
  // SIN `sound`: en un canal de Android ese campo es el NOMBRE DE ARCHIVO de un sonido propio
  // empaquetado en la app, no la palabra "el de siempre". Poniendo 'default' la librería avisa que
  // no encuentra un archivo llamado así. Omitirlo es lo que deja el sonido del sistema.
  await N.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Recordatorios de hábitos',
    importance: N.AndroidImportance.HIGH,
  });
}

function claveDe(userId: string, habitoId: string): string {
  return `${PREFIJO_CLAVE}${userId}.${habitoId}`;
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

/**
 * Programa los avisos diarios de un hábito: uno por cada antelación elegida.
 *
 * Cancela primero el anterior: si no, cambiar la hora dejaría sonando la alarma vieja y sumaría
 * una nueva cada vez. Devuelve `false` si no se pudo (sin permiso, o web).
 *
 * @param horaHHmm hora del hábito, `HH:mm`.
 * @param antelaciones cuántos minutos antes avisar, uno por aviso. `0` = a la hora exacta;
 *                     vacío = sin aviso. Se programa una alarma diaria por cada uno.
 */
export async function programar(
  userId: string,
  habitoId: string,
  titulo: string,
  horaHHmm: string,
  antelaciones: number[],
): Promise<boolean> {
  if (HAY_RECORDATORIOS_WEB) {
    // Web no tiene scheduler local: la suscripción se registra una vez y los dos avisos los
    // despacha el backend para esta persona. Con antelaciones vacías no hay nada que habilitar.
    if (antelaciones.length === 0) return true;
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
  if (antelaciones.length === 0) {
    await sinRomper(() => AsyncStorage.removeItem(claveSet), undefined);
    return true;
  }
  return sinRomper(async () => {
    if (!(await pedirPermiso())) return false;
    await asegurarCanal();
    const ids: string[] = [];
    // De la más temprana a la más tardía, que es el orden en que van a sonar.
    for (const minutosAntes of [...antelaciones].sort((a, b) => b - a)) {
      // Restar puede cruzar la medianoche (07:00 con 90 de antelación son las 05:30 del mismo día;
      // 00:30 con 45 son las 23:45 del anterior). El módulo se normaliza para que nunca quede
      // negativo, que es el caso en que `DAILY` recibiría una hora inválida.
      const minutos = ((h * 60 + m - minutosAntes) % MINUTOS_POR_DIA + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
      const id = await N.scheduleNotificationAsync({
        content: {
          title: minutosAntes > 0 ? `En ${minutosAntes} min: ${titulo}` : titulo,
          body: `Te toca a las ${horaHHmm}.`,
          // `true` y no `'default'`: la cadena se interpreta como el nombre de un archivo de sonido
          // propio, y la librería se queja de no encontrarlo. El booleano pide el del sistema.
          sound: true,
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DAILY,
          hour: Math.floor(minutos / 60),
          minute: minutos % 60,
          channelId: CANAL_ANDROID,
        },
      });
      ids.push(id);
    }
    await AsyncStorage.setItem(claveDe(userId, habitoId), JSON.stringify(ids));
    await AsyncStorage.setItem(claveSet, JSON.stringify(antelaciones));
    return true;
  }, false);
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
        title: 'Armá tu semana',
        body: 'Revisa a qué hora va cada hábito de lunes a domingo. Lo que dejes hoy rige desde mañana.',
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.WEEKLY,
        weekday: DOMINGO_EN_EXPO,
        hour: HORA_REPASO,
        minute: MINUTO_REPASO,
        channelId: CANAL_ANDROID,
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
    if (id) {
      await N.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(CLAVE_REPASO + userId);
    }
  }, undefined);
}
