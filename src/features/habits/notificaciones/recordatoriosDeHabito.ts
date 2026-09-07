import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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
 * ## WEB
 *
 * `expo-notifications` **no soporta web**: sus plataformas son `android` e `ios` y nada más
 * (docs de Expo SDK 57). Esta app sí se despliega a web (`build:web`, `vercel.json`), así que
 * llamar a la librería ahí rompería el build en runtime. Por eso CADA función de este archivo
 * corta en seco con `Platform.OS === 'web'` y devuelve un valor inocuo.
 *
 * Un recordatorio en web de verdad —que suene con la pestaña cerrada— necesita un service worker
 * y Web Push con VAPID, que es otro trabajo entero. Mientras tanto, en web la pantalla no ofrece
 * la alarma en vez de ofrecerla y no cumplirla.
 *
 * ## POR QUÉ SE GUARDA EL IDENTIFICADOR
 *
 * `scheduleNotificationAsync` devuelve un id y esa es la ÚNICA forma de cancelar esa alarma
 * después. Sin guardarlo, cambiar la hora de un hábito dejaría la alarma vieja sonando para
 * siempre y sumaría una nueva cada vez. Se guarda por usuario y por hábito.
 */

const PREFIJO_CLAVE = 'renaser.habitos.recordatorio.';

/** Canal de Android. Sin uno propio, el sistema agrupa estos avisos con cualquier otro. */
const CANAL_ANDROID = 'recordatorios-habitos';

const MINUTOS_POR_DIA = 24 * 60;

/** `true` cuando la plataforma puede programar alarmas locales. Web no puede. */
export const HAY_RECORDATORIOS = Platform.OS !== 'web';

/** Ninguna operación de almacenamiento debe poder tumbar la app. */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

if (HAY_RECORDATORIOS) {
  // Cómo se presenta el aviso si llega con la app abierta. Va al importar el módulo y no dentro de
  // una función: Expo lo quiere configurado antes de que llegue la primera notificación.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Pide permiso, si hace falta. Devuelve `false` en web y cuando la persona lo niega — el llamador
 * tiene que respetar ese `false` y no prometer un aviso que no va a llegar.
 */
export async function pedirPermiso(): Promise<boolean> {
  if (!HAY_RECORDATORIOS) return false;
  return sinRomper(async () => {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    // `canAskAgain === false` = ya lo negó y iOS no vuelve a preguntar: insistir no hace nada.
    if (!actual.canAskAgain) return false;
    const pedido = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return pedido.granted;
  }, false);
}

/** El canal de Android tiene que existir antes de programar contra él. Idempotente. */
async function asegurarCanal(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Recordatorios de hábitos',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

function claveDe(userId: string, habitoId: string): string {
  return `${PREFIJO_CLAVE}${userId}.${habitoId}`;
}

/** Cancela la alarma de ese hábito, si había una. Idempotente. */
export async function cancelar(userId: string, habitoId: string): Promise<void> {
  if (!HAY_RECORDATORIOS) return;
  await sinRomper(async () => {
    const clave = claveDe(userId, habitoId);
    const id = await AsyncStorage.getItem(clave);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(clave);
    }
  }, undefined);
}

/**
 * Programa el aviso diario de un hábito, `minutosAntes` antes de su hora.
 *
 * Cancela primero el anterior: si no, cambiar la hora dejaría sonando la alarma vieja y sumaría
 * una nueva cada vez. Devuelve `false` si no se pudo (sin permiso, o web).
 *
 * @param horaHHmm hora del hábito, `HH:mm`.
 * @param minutosAntes cuánto antes avisar. 0 = a la hora exacta.
 */
export async function programar(
  userId: string,
  habitoId: string,
  titulo: string,
  horaHHmm: string,
  minutosAntes: number,
): Promise<boolean> {
  if (!HAY_RECORDATORIOS) return false;
  const [h, m] = horaHHmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;

  await cancelar(userId, habitoId);
  return sinRomper(async () => {
    if (!(await pedirPermiso())) return false;
    await asegurarCanal();
    // Restar puede cruzar la medianoche (07:00 con 90 de antelación son las 05:30 del mismo día;
    // 00:30 con 45 son las 23:45 del anterior). El módulo se normaliza para que nunca quede
    // negativo, que es el caso en que `DAILY` recibiría una hora inválida.
    const minutos = ((h * 60 + m - minutosAntes) % MINUTOS_POR_DIA + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: minutosAntes > 0 ? `En ${minutosAntes} min: ${titulo}` : titulo,
        body: `Te toca a las ${horaHHmm}.`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(minutos / 60),
        minute: minutos % 60,
        channelId: CANAL_ANDROID,
      },
    });
    await AsyncStorage.setItem(claveDe(userId, habitoId), id);
    return true;
  }, false);
}
