import { Platform } from 'react-native';

import { API_CONFIG } from '../../../config/apiConfig';
import { SIN_PERMISO } from './bienvenida';

/**
 * La vista previa de la tarjeta de bienvenida (backend D-210): `GET /api/v1/admin/bienvenida/tarjeta`
 * devuelve un JPEG, pide la sesión y, si la portada candidata no sirve, contesta 400 con el motivo en
 * `{ message }`. Ninguna de las dos cosas la resuelve un `Image` solo: no lee el motivo de un error, y
 * en web `<img>` no manda cabeceras.
 *
 * Por eso hay UN camino para todas las plataformas: se trae con `fetch` y la sesión; si falla se lee
 * el `message`, y si sale bien se convierte en algo que un `Image` puede mostrar —un object URL en web
 * (que hay que liberar al reemplazarlo) y un data URI en Android/iOS—. Es el mismo criterio que la
 * foto del chat de soporte (`chat/utils/fotoDelSoporte.ts`), con el error a la vista.
 */

const HEADER_SESION = 'X-Auth-Token';

export const SIN_RED = 'Sin conexión con el servidor.';
const NO_SE_PUDO = 'No se pudo mostrar la tarjeta.';

export type TarjetaDeMuestra =
  | { ok: true; uri: string }
  | { ok: false; status: number; mensaje: string };

/** Lo mínimo de una respuesta de `fetch` que hace falta acá. */
export interface RespuestaDeImagen {
  ok: boolean;
  status: number;
  blob: () => Promise<Blob>;
  text: () => Promise<string>;
}

/** Lo que la vista previa necesita del entorno; inyectable para probarla sin red ni navegador. */
export interface EntornoDeLaTarjeta {
  pedir: (url: string, opciones: { headers: Record<string, string> }) => Promise<RespuestaDeImagen>;
  /** El blob de la imagen como algo que un `Image` muestra: object URL en web, data URI en el teléfono. */
  aUri: (blob: Blob) => Promise<string>;
  /** Libera lo que `aUri` haya reservado (el object URL de web). En Android/iOS no hay nada que liberar. */
  liberar: (uri: string) => void;
}

/** En web, un object URL; en Android/iOS, un data URI leído con `FileReader`. */
export function entornoDeLaPlataforma(esWeb: boolean = Platform.OS === 'web'): EntornoDeLaTarjeta {
  return {
    pedir: (url, opciones) => fetch(url, opciones) as unknown as Promise<RespuestaDeImagen>,
    aUri: esWeb ? async blob => URL.createObjectURL(blob) : leerComoDataUri,
    liberar: esWeb
      ? uri => {
          if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
        }
      : () => {},
  };
}

function leerComoDataUri(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () =>
      typeof lector.result === 'string' ? resolver(lector.result) : rechazar(new Error('La imagen vino vacía'));
    lector.onerror = () => rechazar(lector.error ?? new Error('No se pudo leer la imagen'));
    lector.readAsDataURL(blob);
  });
}

/**
 * Trae la tarjeta de `ruta` (relativa al backend, p. ej. `rutaDeLaTarjetaDeMuestra(…)`). Nunca lanza:
 * devuelve la imagen lista para mostrar o el motivo para leer. Un 403 siempre dice quién puede.
 */
export async function traerTarjetaDeMuestra(
  ruta: string,
  token: string | null,
  entorno: EntornoDeLaTarjeta = entornoDeLaPlataforma(),
): Promise<TarjetaDeMuestra> {
  // La imagen, y el JSON de un error: el servidor manda los errores como JSON aunque se pida la imagen.
  const headers: Record<string, string> = { Accept: 'image/jpeg, application/json' };
  if (token) headers[HEADER_SESION] = token;

  let respuesta: RespuestaDeImagen;
  try {
    respuesta = await entorno.pedir(`${API_CONFIG.BASE_URL}${ruta}`, { headers });
  } catch {
    return { ok: false, status: 0, mensaje: SIN_RED };
  }
  if (!respuesta.ok) {
    return { ok: false, status: respuesta.status, mensaje: await motivoDelError(respuesta) };
  }
  try {
    return { ok: true, uri: await entorno.aUri(await respuesta.blob()) };
  } catch {
    return { ok: false, status: respuesta.status, mensaje: NO_SE_PUDO };
  }
}

async function motivoDelError(respuesta: RespuestaDeImagen): Promise<string> {
  if (respuesta.status === 403) return SIN_PERMISO;
  if (respuesta.status === 401) return 'Tu sesión venció. Vuelve a entrar.';
  try {
    const cuerpo = JSON.parse(await respuesta.text()) as { message?: unknown } | null;
    const mensaje = typeof cuerpo?.message === 'string' ? cuerpo.message.trim() : '';
    if (mensaje) return mensaje;
  } catch {
    // Un cuerpo que no es JSON (un proxy, un 502): no se muestra crudo.
  }
  return NO_SE_PUDO;
}
