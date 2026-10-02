import { Linking, Platform } from 'react-native';

/**
 * Enlaces a las páginas legales públicas de Renaser (D-245).
 *
 * La Política de Privacidad vive como HTML estático en `public/privacidad/index.html`: Expo la
 * copia a `dist/` y Vercel la sirve tal cual, sin JavaScript, para que Google Play (y cualquiera
 * sin la app) la pueda leer con un link directo.
 *
 * - En **nativo** se abre con la URL pública absoluta en el navegador del teléfono.
 * - En **web** es una ruta del mismo sitio: se abre en otra pestaña para no sacar a la persona de
 *   la app (ni perder lo que estaba llenando en el registro).
 *
 * El dominio es el de producción de Vercel que usa hoy la web. Si algún día cambia (dominio
 * propio), se puede inyectar al compilar con `EXPO_PUBLIC_WEB_URL` sin tocar este archivo.
 */
export const WEB_PUBLICA_POR_DEFECTO = 'https://renaser-90-dias-frontend-livid.vercel.app';

export const RUTA_POLITICA_DE_PRIVACIDAD = '/privacidad/';

/**
 * El correo de contacto de Renaser para privacidad, derechos ARCO y soporte de quien ya no puede
 * entrar a la app (cuenta cerrada). Lo dio el dueño el 2026-10-06; es el mismo que publican
 * `public/privacidad/` y `public/eliminar-cuenta/`.
 */
export const CORREO_DE_CONTACTO = 'renaserlab@gmail.com';

/** Base pública sin barras finales. Una base vacía o en blanco cae al dominio de producción. */
export function baseWebPublica(configurada: string | undefined = process.env.EXPO_PUBLIC_WEB_URL): string {
  const limpia = (configurada ?? '').trim().replace(/\/+$/, '');
  return limpia || WEB_PUBLICA_POR_DEFECTO;
}

/** URL absoluta de la Política de Privacidad (la que se declara en Google Play). */
export function urlDePoliticaDePrivacidad(base?: string): string {
  return `${baseWebPublica(base)}${RUTA_POLITICA_DE_PRIVACIDAD}`;
}

/**
 * Lo que se abre al tocar «Política de privacidad». En web es la ruta relativa del propio sitio
 * (funciona igual en producción, en una vista previa de Vercel o en local); en nativo, la absoluta.
 */
export function destinoDePoliticaDePrivacidad(plataforma: string, base?: string): string {
  return plataforma === 'web' ? RUTA_POLITICA_DE_PRIVACIDAD : urlDePoliticaDePrivacidad(base);
}

export async function abrirPoliticaDePrivacidad(): Promise<void> {
  const destino = destinoDePoliticaDePrivacidad(Platform.OS);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(destino, '_blank', 'noopener');
    return;
  }
  try {
    await Linking.openURL(destino);
  } catch {
    // Sin navegador disponible no hay nada útil que hacer desde acá; la URL sigue publicada.
  }
}
