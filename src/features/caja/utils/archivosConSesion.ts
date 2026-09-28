import { Platform } from 'react-native';

import { API_CONFIG } from '../../../config/apiConfig';

/**
 * Los dos archivos de la Caja Renaser que sirve el backend CON sesión: la planilla de envíos
 * (`export.csv`) y la carta de cada aprendiz (un PNG para imprimir).
 *
 * - **Ver la carta** en la app: se trae con `fetch` y la sesión y se convierte en algo que un `Image`
 *   muestra —object URL en web, data URI en el teléfono—, igual que la tarjeta de muestra de la
 *   bienvenida (`admin/utils/tarjetaDeMuestra.ts`). Si falla, se lee el motivo del servidor.
 * - **Descargar**: en web, descarga directa del navegador (un `<a download>` sobre el blob). En el
 *   teléfono, se guarda en la caché con `expo-file-system` y se abre la hoja de compartir del sistema
 *   (`expo-sharing`): de ahí va a WhatsApp, a Drive o a la impresora.
 *
 * Todo lo de afuera entra por un `entorno` inyectable, para probar cada salida sin red ni teléfono.
 */

const HEADER_SESION = 'X-Auth-Token';

export const SIN_RED = 'Sin conexión con el servidor.';
export const SIN_PERMISO = 'Solo Administración puede ver esto.';
export const SESION_VENCIDA = 'Tu sesión venció. Vuelve a entrar.';

export type Resultado<T> = { ok: true; valor: T } | { ok: false; status: number; mensaje: string };

export interface RespuestaDeArchivo {
  ok: boolean;
  status: number;
  blob: () => Promise<Blob>;
  text: () => Promise<string>;
}

export interface EntornoDeArchivos {
  esWeb: boolean;
  pedir: (url: string, opciones: { headers: Record<string, string> }) => Promise<RespuestaDeArchivo>;
  /** Blob → algo que un `Image` muestra (object URL en web, data URI en el teléfono). */
  aUri: (blob: Blob) => Promise<string>;
  liberar: (uri: string) => void;
  /** Web: dispara la descarga del navegador con ese nombre. */
  guardarEnElNavegador: (blob: Blob, nombre: string) => void;
  /** Teléfono: baja el archivo a la caché con la sesión y devuelve su `uri` local. Lanza si falla. */
  bajarAlTelefono: (url: string, nombre: string, headers: Record<string, string>) => Promise<string>;
  /** Teléfono: abre la hoja de compartir. `false` si el sistema no puede compartir. */
  compartir: (uri: string, opciones: { mimeType: string; titulo: string }) => Promise<boolean>;
}

function cabeceras(token: string | null, aceptar: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: `${aceptar}, application/json` };
  if (token) headers[HEADER_SESION] = token;
  return headers;
}

/** El texto para una respuesta que no salió bien: el `message` del servidor si lo trae. */
export async function motivoDelError(respuesta: Pick<RespuestaDeArchivo, 'status' | 'text'>, porDefecto: string): Promise<string> {
  if (respuesta.status === 401) return SESION_VENCIDA;
  if (respuesta.status === 403) return SIN_PERMISO;
  try {
    const cuerpo = JSON.parse(await respuesta.text()) as { message?: unknown } | null;
    const mensaje = typeof cuerpo?.message === 'string' ? cuerpo.message.trim() : '';
    if (mensaje) return mensaje;
  } catch {
    // Un cuerpo que no es JSON (un proxy, un 502): no se muestra crudo.
  }
  return porDefecto;
}

/** Trae la imagen de `ruta` lista para un `Image`. Nunca lanza. */
export async function traerImagenConSesion(
  ruta: string,
  token: string | null,
  entorno: EntornoDeArchivos = entornoDeLaPlataforma(),
  aceptar = 'image/png',
): Promise<Resultado<string>> {
  let respuesta: RespuestaDeArchivo;
  try {
    respuesta = await entorno.pedir(`${API_CONFIG.BASE_URL}${ruta}`, { headers: cabeceras(token, aceptar) });
  } catch {
    return { ok: false, status: 0, mensaje: SIN_RED };
  }
  if (!respuesta.ok) {
    return { ok: false, status: respuesta.status, mensaje: await motivoDelError(respuesta, 'No se pudo mostrar la imagen.') };
  }
  try {
    return { ok: true, valor: await entorno.aUri(await respuesta.blob()) };
  } catch {
    return { ok: false, status: respuesta.status, mensaje: 'No se pudo mostrar la imagen.' };
  }
}

export interface ArchivoParaDescargar {
  ruta: string;
  nombre: string;
  tipo: string;
  /** El título de la hoja de compartir del teléfono. */
  titulo: string;
}

/** El número de estado dentro del error de `expo-file-system` («HTTP 403», «response has status: 403»). */
export function statusDelError(error: unknown): number {
  const texto = error instanceof Error ? error.message : String(error ?? '');
  const m = /(?:HTTP|status:?)\s*(\d{3})/i.exec(texto);
  return m ? Number(m[1]) : 0;
}

/**
 * Descarga (web) o comparte (teléfono) el archivo. Nunca lanza: devuelve el motivo si falla.
 * En el teléfono no se puede leer el `message` de un error del servidor (el archivo no llega a
 * bajarse), así que se dice lo que el estado permite decir.
 */
export async function descargarConSesion(
  archivo: ArchivoParaDescargar,
  token: string | null,
  entorno: EntornoDeArchivos = entornoDeLaPlataforma(),
): Promise<Resultado<null>> {
  const url = `${API_CONFIG.BASE_URL}${archivo.ruta}`;
  const headers = cabeceras(token, archivo.tipo);
  if (entorno.esWeb) {
    let respuesta: RespuestaDeArchivo;
    try {
      respuesta = await entorno.pedir(url, { headers });
    } catch {
      return { ok: false, status: 0, mensaje: SIN_RED };
    }
    if (!respuesta.ok) {
      return { ok: false, status: respuesta.status, mensaje: await motivoDelError(respuesta, 'No se pudo descargar.') };
    }
    entorno.guardarEnElNavegador(await respuesta.blob(), archivo.nombre);
    return { ok: true, valor: null };
  }
  let uri: string;
  try {
    uri = await entorno.bajarAlTelefono(url, archivo.nombre, headers);
  } catch (error) {
    const status = statusDelError(error);
    const mensaje = status === 401 ? SESION_VENCIDA : status === 403 ? SIN_PERMISO : status === 0 ? SIN_RED : 'No se pudo descargar.';
    return { ok: false, status, mensaje };
  }
  const compartido = await entorno.compartir(uri, { mimeType: archivo.tipo, titulo: archivo.titulo }).catch(() => false);
  return compartido ? { ok: true, valor: null } : { ok: false, status: 200, mensaje: 'Este teléfono no deja compartir archivos.' };
}

// ─── El entorno real ────────────────────────────────────────────────────────

function leerComoDataUri(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () =>
      typeof lector.result === 'string' ? resolver(lector.result) : rechazar(new Error('La imagen vino vacía'));
    lector.onerror = () => rechazar(lector.error ?? new Error('No se pudo leer la imagen'));
    lector.readAsDataURL(blob);
  });
}

function guardarEnElNavegador(blob: Blob, nombre: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // El navegador ya tomó el archivo; se libera un momento después para no cortar la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * `expo-file-system` y `expo-sharing` se cargan recién al usarse, y solo en el teléfono: en web no
 * hacen falta y así las pruebas de lo demás no dependen de sus módulos nativos.
 */
async function bajarAlTelefono(url: string, nombre: string, headers: Record<string, string>): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const destino = new File(Paths.cache, nombre);
  const archivo = await File.downloadFileAsync(url, destino, { headers, idempotent: true });
  return archivo.uri;
}

async function compartir(uri: string, opciones: { mimeType: string; titulo: string }): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: opciones.mimeType, dialogTitle: opciones.titulo });
  return true;
}

export function entornoDeLaPlataforma(esWeb: boolean = Platform.OS === 'web'): EntornoDeArchivos {
  return {
    esWeb,
    pedir: (url, opciones) => fetch(url, opciones) as unknown as Promise<RespuestaDeArchivo>,
    aUri: esWeb ? async blob => URL.createObjectURL(blob) : leerComoDataUri,
    liberar: esWeb
      ? uri => {
          if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
        }
      : () => {},
    guardarEnElNavegador,
    bajarAlTelefono,
    compartir,
  };
}
