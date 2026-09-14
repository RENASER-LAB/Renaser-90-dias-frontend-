import { Platform } from 'react-native';

/**
 * Configuración segura de APIs y servicios externos.
 * Las variables con prefijo EXPO_PUBLIC_ se inyectan automáticamente desde el archivo .env
 *
 * IMPORTANTE: EXPO_PUBLIC_ no significa "secreto". Expo incrusta estos valores en el bundle
 * de JavaScript al compilar, así que cualquiera que descargue la app puede leerlos. Sirven
 * para lo que es público por diseño (la URL de la API, el client_id de OAuth) y nunca para
 * una credencial. El client_secret de Google vive solo en el backend.
 */

/**
 * `localhost` no significa lo mismo en cada plataforma: dentro del emulador de Android apunta
 * al propio emulador, no a la máquina que corre el backend. 10.0.2.2 es el alias que el
 * emulador expone para el host. En un dispositivo físico no sirve ninguno de los dos: hay que
 * poner la IP de la red local en EXPO_PUBLIC_API_URL.
 */
function resolverUrlBase(): string {
  const configurada = process.env.EXPO_PUBLIC_API_URL;
  if (configurada) {
    return configurada.replace(/\/+$/, '');
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }
  return 'http://localhost:8080';
}

/**
 * `GOOGLE_PLACES_API_KEY` se quito el 2026-09-14, antes del primer build para Play Store.
 *
 * Era una CREDENCIAL con prefijo `EXPO_PUBLIC_`, o sea incrustada en el bundle y extraible de un
 * `.aab` con `unzip` y `strings`. Sin restringir por huella SHA-1 mas nombre de paquete, cualquiera
 * que descargue la app puede usarla y el consumo lo paga el dueno de la cuenta de Google.
 *
 * Nunca estuvo configurada, asi que no se perdio ninguna funcion que estuviera andando; lo que se
 * quita es la posibilidad de agregarla y publicarla sin darse cuenta. Ver `locationService.ts`
 * para que se pierde exactamente y como volver a encenderlo bien.
 */
export const API_CONFIG = {
  BASE_URL: resolverUrlBase(),
  GOOGLE_OAUTH_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '',
};
