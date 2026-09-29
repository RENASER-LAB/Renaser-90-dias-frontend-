import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { apiFetch } from '../../../services/http/apiClient';
import { CANAL_DE_MENSAJES } from '../../chat/avisos/canalDeMensajes';
// SOLO tipos: `import type` se borra al compilar, así que esto NO carga el módulo en runtime.
// El módulo se carga con `require` más abajo, por el mismo motivo que en
// `features/habits/notificaciones/recordatoriosDeHabito.ts`: importarlo de verdad dispara su
// efecto secundario de push y rompe Expo Go.
import type * as TipoNotificaciones from 'expo-notifications';

/**
 * Registro del teléfono para recibir los avisos de acompañamiento (RF-19, RF-25).
 *
 * El canal web ya existe y no se toca: `features/habits/notificaciones/webPush.ts` registra una
 * suscripción VAPID y el backend la despacha por ese transporte. Esto es la contraparte nativa —
 * `PlataformaPush.IOS` / `ANDROID`, que salen por Expo—, y termina en el MISMO endpoint,
 * `POST /api/v1/push-tokens`, que hace upsert por token.
 *
 * La identidad viaja solo en la sesión `X-Auth-Token`. Este archivo nunca manda un `userId`:
 * si lo mandara, cualquiera con el bundle podría registrar su teléfono a nombre de otra persona.
 */

/** Canal de Android propio. Sin uno, el sistema mezcla estos avisos con los de hábitos. */
const CANAL_ANDROID = 'avisos-acompanamiento';

/**
 * Expo Go se reconoce por `executionEnvironment` — `appOwnership` está deprecado. Importa más
 * que en los recordatorios locales: desde SDK 53 Expo Go **no entrega push remoto**, así que
 * pedir el token ahí devolvería uno que nunca recibe nada. Peor que no registrar: el backend
 * creería tener un destino vivo y contaría los envíos como entregados.
 */
const ES_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Push nativo: solo development build o app instalada, en Android o iOS. */
export const HAY_PUSH_NATIVO = Platform.OS !== 'web' && !ES_EXPO_GO;

/**
 * Por qué terminó el registro. Se devuelve un motivo y no un booleano a propósito: "el usuario
 * dijo que no" y "falta configurar las credenciales del proyecto" se arreglan de maneras muy
 * distintas, y con `false` para las dos nadie sabe cuál pasó.
 */
export type ResultadoRegistroPush =
  | { estado: 'registrado'; token: string }
  | { estado: 'no_aplica' }            // web, o Expo Go
  | { estado: 'sin_permiso' }          // la persona lo rechazó, o el sistema lo tiene bloqueado
  | { estado: 'sin_project_id' }       // falta `extra.eas.projectId`: es configuración, no un fallo
  | { estado: 'fallo'; detalle: string };

/**
 * El identificador del proyecto EAS, que es lo que ata el token a estas credenciales de push.
 *
 * Se lee de la configuración y NO se escribe a mano en el código: `eas init` lo genera y lo deja
 * en `app.json`, y un valor inventado produce tokens que el servicio de Expo rechaza al enviar,
 * no al pedirlos — o sea que el fallo aparecería semanas después y lejos de acá.
 */
function projectId(): string | null {
  const config = Constants.expoConfig as { extra?: { eas?: { projectId?: string } } } | null;
  return config?.extra?.eas?.projectId
    ?? (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
    ?? null;
}

let modulo: typeof TipoNotificaciones | null = null;

function notificaciones(): typeof TipoNotificaciones | null {
  if (!HAY_PUSH_NATIVO) return null;
  if (modulo === null) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    modulo = require('expo-notifications') as typeof TipoNotificaciones;
  }
  return modulo;
}

/**
 * Pide el permiso **solo si hace falta preguntarlo**, y nunca al arrancar la app.
 *
 * `getPermissionsAsync` primero no es una optimización: en iOS `requestPermissionsAsync` sobre un
 * permiso ya denegado no vuelve a mostrar el diálogo del sistema, así que preguntar de nuevo no
 * consigue nada y en cambio gasta la única oportunidad si todavía estaba sin decidir.
 */
async function permisoConcedido(N: typeof TipoNotificaciones): Promise<boolean> {
  const actual = await N.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  const pedido = await N.requestPermissionsAsync();
  return pedido.granted;
}

/**
 * Registra este teléfono para los avisos. Idempotente: el endpoint hace upsert por token, así
 * que llamarlo en cada arranque no crea destinos duplicados.
 *
 * **No lanza nunca.** Un fallo acá no puede tumbar el arranque de la app: el aviso también queda
 * guardado en la bandeja de la aplicación (`NotificacionService`), y esa es la vía que siempre
 * funciona. El push es el atajo, no el canal.
 */
export async function registrarTokenPushNativo(): Promise<ResultadoRegistroPush> {
  const registro = registrarAhora();
  registroEnCurso = registro;
  return registro;
}

/** El registro en vuelo, para quien necesita el token apenas exista (la confirmación de D-217). */
let registroEnCurso: Promise<ResultadoRegistroPush> | null = null;

/**
 * El token registrado; si el registro todavía está en vuelo, lo espera (a lo sumo `esperaMs`). Al abrir
 * la app las dos cosas arrancan juntas, y sin esperar la confirmación de alarmas salía siempre sin token.
 */
export async function esperarTokenPush(esperaMs = 15_000): Promise<string | null> {
  if (tokenRegistrado || !registroEnCurso) return tokenRegistrado;
  let vencio: ReturnType<typeof setTimeout> | undefined;
  const plazo = new Promise<null>(resolver => { vencio = setTimeout(() => resolver(null), esperaMs); });
  try {
    const resultado = await Promise.race([registroEnCurso, plazo]);
    return resultado && resultado.estado === 'registrado' ? resultado.token : tokenRegistrado;
  } finally {
    if (vencio) clearTimeout(vencio);
  }
}

async function registrarAhora(): Promise<ResultadoRegistroPush> {
  const N = notificaciones();
  if (!N) return { estado: 'no_aplica' };

  const proyecto = projectId();
  if (!proyecto) return { estado: 'sin_project_id' };

  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CANAL_ANDROID, {
        name: 'Avisos de acompañamiento',
        importance: N.AndroidImportance.DEFAULT,
      });
      // D-221 (2026-09-29): el de los mensajes del chat, con su sonido propio y como banner (HIGH),
      // antes del token: el primer push de chat puede llegar apenas se registra.
      await N.setNotificationChannelAsync(CANAL_DE_MENSAJES.id, {
        name: CANAL_DE_MENSAJES.nombre,
        importance: N.AndroidImportance.HIGH,
        sound: CANAL_DE_MENSAJES.sonido,
      });
    }

    if (!(await permisoConcedido(N))) return { estado: 'sin_permiso' };

    const { data: token } = await N.getExpoPushTokenAsync({ projectId: proyecto });
    await enviarAlBackend(token);
    tokenRegistrado = token;
    return { estado: 'registrado', token };
  } catch (error) {
    return { estado: 'fallo', detalle: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * El token de este teléfono ya registrado en el servidor en esta sesión, o `null`. Lo usa la
 * confirmación de alarmas locales (D-217): el servidor la guarda por token, así que sin token no hay
 * a qué atarla.
 */
let tokenRegistrado: string | null = null;

export function tokenPushRegistrado(): string | null {
  return tokenRegistrado;
}

/** Al cerrar sesión: el token queda del teléfono, pero la confirmación es de la persona que entra. */
export function olvidarTokenPushRegistrado(): void {
  tokenRegistrado = null;
  registroEnCurso = null;
}

async function enviarAlBackend(token: string): Promise<void> {
  await apiFetch('/api/v1/push-tokens', {
    method: 'POST',
    body: { platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID', token },
  });
}

/**
 * El token de Expo **cambia solo**: al reinstalar, al restaurar un respaldo, o cuando el
 * proveedor lo rota. Sin escuchar esto, el backend se queda con el viejo y los avisos dejan de
 * llegar sin que nadie lo note — el envío no falla, va a un destino que ya no existe.
 *
 * Devuelve la función para dejar de escuchar; quien la monta es responsable de llamarla.
 */
export function escucharRotacionDeToken(): () => void {
  const N = notificaciones();
  if (!N) return () => {};

  const suscripcion = N.addPushTokenListener(nuevo => {
    // `data` es el token de Expo (string) cuando se pidió por `getExpoPushTokenAsync`. Si algún
    // día llegara el token nativo crudo, no es lo que este backend sabe despachar: se ignora en
    // vez de mandar algo que el transporte de Expo rechazaría por no empezar con "ExponentPush".
    if (typeof nuevo.data === 'string') {
      const token = nuevo.data;
      void enviarAlBackend(token).then(() => { tokenRegistrado = token; }).catch(() => {});
    }
  });
  return () => suscripcion.remove();
}
