import { fetch as expoFetch } from 'expo/fetch';

import { API_CONFIG } from '../../../config/apiConfig';
import { getTokenSesion } from '../../../services/http/apiClient';

const RUTA_VOZ = '/api/v1/renasia/voz';
const HEADER_SESION = 'X-Auth-Token';
/** Pedir la voz es solo registrar el texto (el audio se genera aparte); si tarda más, algo anda mal. */
const ESPERA_MAXIMA_MS = 4000;

/**
 * - `audio`: la URL de donde el reproductor baja el WAV **mientras se genera** (D-159), con el header
 *   de sesión que tiene que mandar.
 * - `sin-voz`: el backend no tiene voz configurada (204). Por un minuto no se vuelve a preguntar:
 *   cada oración sale directo con la voz del teléfono.
 * - `fallo`: esta oración no se pudo; la dice la voz del teléfono y la próxima se reintenta.
 */
export type VozSintetizada =
  { tipo: 'audio'; uri: string; headers: Record<string, string> } | { tipo: 'sin-voz' } | { tipo: 'fallo' };

const PAUSA_SIN_VOZ_MS = 60_000;
let sinVozHasta = 0;

/**
 * `POST /api/v1/renasia/voz` (D-159): el backend empieza a generar la oración con la voz de Gemini
 * y devuelve dónde escucharla. Se pide apenas llega cada oración, así que cuando le toca sonar a la
 * segunda ya está generada. Nunca lanza: cualquier problema cae a la voz del teléfono.
 *
 * > Corregido 2026-09-23: la primera versión (D-157) recibía el WAV entero en la respuesta y lo
 * > pasaba como URI `data:`. Con Gemini, esperar el audio completo tardaba 4–7 s por frase.
 */
export async function sintetizarVoz(texto: string, signal: AbortSignal): Promise<VozSintetizada> {
  if (Date.now() < sinVozHasta) return { tipo: 'sin-voz' };
  const limite = new AbortController();
  const cortar = () => limite.abort();
  const reloj = setTimeout(cortar, ESPERA_MAXIMA_MS);
  signal.addEventListener('abort', cortar);
  try {
    const token = getTokenSesion();
    const sesion: Record<string, string> = token ? { [HEADER_SESION]: token } : {};
    const respuesta = await expoFetch(`${API_CONFIG.BASE_URL}${RUTA_VOZ}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...sesion,
      },
      body: JSON.stringify({ texto }),
      signal: limite.signal,
    });
    if (respuesta.status === 204) {
      sinVozHasta = Date.now() + PAUSA_SIN_VOZ_MS;
      return { tipo: 'sin-voz' };
    }
    if (respuesta.status !== 201) return { tipo: 'fallo' };
    const ruta = rutaDelAudio(await respuesta.json());
    return ruta ? { tipo: 'audio', uri: `${API_CONFIG.BASE_URL}${ruta}`, headers: sesion } : { tipo: 'fallo' };
  } catch {
    return { tipo: 'fallo' };
  } finally {
    clearTimeout(reloj);
    signal.removeEventListener('abort', cortar);
  }
}

/** Solo se acepta una ruta del propio endpoint: el reproductor le manda el token de sesión. */
export function rutaDelAudio(cuerpo: unknown): string | null {
  const audio = (cuerpo as { audio?: unknown } | null)?.audio;
  return typeof audio === 'string' && /^\/api\/v1\/renasia\/voz\/[\w-]+$/.test(audio) ? audio : null;
}
