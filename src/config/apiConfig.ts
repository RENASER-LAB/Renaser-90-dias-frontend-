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
  const configurada = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

  /*
   * En un build de release la variable NO es opcional, y tampoco vale cualquier valor.
   *
   * > **Agregado el 2026-09-23.** Antes, si `EXPO_PUBLIC_API_URL` no llegaba al build, esta
   * > función caía callada en `http://10.0.2.2:8080` —la dirección del HOST DEL EMULADOR, y en
   * > texto plano—. Eso compila, pasa las pruebas y se publica: la app instalada apunta a una
   * > dirección que en un teléfono de verdad no existe, y cada llamada falla sin que nadie sepa
   * > por qué. Se detectó revisando el bundle antes de subir a Play Store, no en una prueba.
   * >
   * > Ahora un release mal configurado **falla al arrancar, con el motivo escrito**. Es peor de
   * > ver y mucho mejor de tener: una app que no abre se detecta en el primer minuto de prueba
   * > interna; una que abre y no habla con el servidor se detecta cuando la instala el padrón.
   */
  if (!__DEV__) {
    if (!configurada) {
      throw new Error(
        'EXPO_PUBLIC_API_URL no está definida en este build. Se define en el perfil de eas.json ' +
          'o como variable de entorno de EAS. Sin ella la app no sabe contra qué servidor hablar.'
      );
    }
    if (!configurada.startsWith('https://')) {
      throw new Error(
        `EXPO_PUBLIC_API_URL debe ser https en un build de release y llegó "${configurada}". ` +
          'Por texto plano viajan el token de sesión y los datos del participante.'
      );
    }
    return configurada;
  }

  if (configurada) {
    return configurada;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }
  return 'http://localhost:8080';
}

export const API_CONFIG = {
  GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',
  BASE_URL: resolverUrlBase(),
  GOOGLE_OAUTH_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '',
};
