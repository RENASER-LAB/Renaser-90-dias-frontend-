import { fetch as expoFetch } from 'expo/fetch';

import { API_CONFIG } from '../../../config/apiConfig';
import { getTokenSesion } from '../../../services/http/apiClient';
import { bytesABase64, esWav, segundosDeWav } from '../utils/audioWav';

const RUTA_VOZ = '/api/v1/renasia/voz';
/** Una oración tarda ~0,3 s en el servidor de voz; pasado esto conviene más la voz del teléfono. */
const ESPERA_MAXIMA_MS = 6000;

/**
 * - `audio`: WAV listo para el reproductor, como URI `data:` (el `DefaultDataSource` de Android la
 *   lee sin escribir archivos).
 * - `sin-voz`: el backend respondió 204 (no tiene voz configurada, o su servicio de voz falló). Por
 *   un minuto no se vuelve a preguntar: cada oración sale directo con la voz del teléfono.
 * - `fallo`: esta oración no se pudo; la dice la voz del teléfono y la próxima se reintenta.
 */
export type VozSintetizada =
  | { tipo: 'audio'; uri: string; segundos: number }
  | { tipo: 'sin-voz' }
  | { tipo: 'fallo' };

const PAUSA_SIN_VOZ_MS = 60_000;
let sinVozHasta = 0;

/**
 * `POST /api/v1/renasia/voz` (D-157): la oración dicha con la voz natural del servidor (Piper,
 * es_MX). Nunca lanza: cualquier problema cae a la voz del teléfono, que es lo que había antes.
 */
export async function sintetizarVoz(texto: string, signal: AbortSignal): Promise<VozSintetizada> {
  if (Date.now() < sinVozHasta) return { tipo: 'sin-voz' };
  const limite = new AbortController();
  const cortar = () => limite.abort();
  const reloj = setTimeout(cortar, ESPERA_MAXIMA_MS);
  signal.addEventListener('abort', cortar);
  try {
    const token = getTokenSesion();
    const respuesta = await expoFetch(`${API_CONFIG.BASE_URL}${RUTA_VOZ}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Con `audio/wav` solo, un 400 o 403 en JSON podría volver como 406.
        Accept: 'audio/wav, application/json',
        ...(token ? { 'X-Auth-Token': token } : {}),
      },
      body: JSON.stringify({ texto }),
      signal: limite.signal,
    });
    if (respuesta.status === 204) {
      sinVozHasta = Date.now() + PAUSA_SIN_VOZ_MS;
      return { tipo: 'sin-voz' };
    }
    if (!respuesta.ok) return { tipo: 'fallo' };
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    if (!esWav(bytes)) return { tipo: 'fallo' };
    return { tipo: 'audio', uri: `data:audio/wav;base64,${bytesABase64(bytes)}`, segundos: segundosDeWav(bytes) };
  } catch {
    return { tipo: 'fallo' };
  } finally {
    clearTimeout(reloj);
    signal.removeEventListener('abort', cortar);
  }
}
