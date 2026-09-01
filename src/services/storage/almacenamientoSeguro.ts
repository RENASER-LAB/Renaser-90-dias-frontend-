import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Guarda credenciales: el token de sesión (`X-Auth-Token`) y el id de la solicitud de alta.
 *
 * Los dos son credenciales de verdad, no datos: quien tenga el token ES la sesión, y el backend
 * documenta que el UUID de la solicitud es la única credencial para consultar su estado ("la
 * credencial es la posesión del UUID, que no es adivinable"). Por eso no van a AsyncStorage, que
 * guarda texto plano legible en un Android con root.
 *
 * - **Nativo**: `expo-secure-store` — Keychain en iOS, Keystore/EncryptedSharedPreferences en
 *   Android. El cifrado lo hace el sistema operativo.
 * - **Web**: `localStorage`. Es una degradación consciente y hay que decirlo: en un navegador NO
 *   existe almacenamiento inaccesible a JavaScript, así que cualquier script de la página puede
 *   leerlo. Es un límite de la plataforma, no del código. La protección real está en nativo, que
 *   es donde corre la app de los aprendices.
 *
 * SecureStore admite hasta ~2 KB por valor: de sobra para un token y un UUID.
 */

const enWeb = Platform.OS === 'web';

async function guardarCrudo(clave: string, valor: string): Promise<void> {
  if (enWeb) {
    globalThis.localStorage?.setItem(clave, valor);
    return;
  }
  await SecureStore.setItemAsync(clave, valor);
}

async function leerCrudo(clave: string): Promise<string | null> {
  if (enWeb) {
    return globalThis.localStorage?.getItem(clave) ?? null;
  }
  return SecureStore.getItemAsync(clave);
}

async function borrarCrudo(clave: string): Promise<void> {
  if (enWeb) {
    globalThis.localStorage?.removeItem(clave);
    return;
  }
  await SecureStore.deleteItemAsync(clave);
}

/**
 * Ninguna operación de almacenamiento debe poder tumbar la app: si el Keychain falla (dispositivo
 * bloqueado, permisos), lo correcto es seguir sin sesión persistida, no reventar. Se degrada a
 * "no hay nada guardado", que es un estado que el resto del código ya sabe manejar.
 */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

const CLAVE_TOKEN = 'renaser.sesion.token';
const CLAVE_SOLICITUD = 'renaser.alta.accountRequestId';

export const almacenamientoSeguro = {
  guardarToken: (token: string) => sinRomper(() => guardarCrudo(CLAVE_TOKEN, token), undefined),
  leerToken: () => sinRomper(() => leerCrudo(CLAVE_TOKEN), null),
  borrarToken: () => sinRomper(() => borrarCrudo(CLAVE_TOKEN), undefined),

  guardarSolicitud: (id: string) => sinRomper(() => guardarCrudo(CLAVE_SOLICITUD, id), undefined),
  leerSolicitud: () => sinRomper(() => leerCrudo(CLAVE_SOLICITUD), null),
  borrarSolicitud: () => sinRomper(() => borrarCrudo(CLAVE_SOLICITUD), undefined),
};
