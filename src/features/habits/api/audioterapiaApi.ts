import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from './habitsSchemas';

/**
 * La audioterapia de la SEMANA: qué audio le toca escuchar al aprendiz antes de completar el
 * hábito `AUDIO_THERAPY_WEEKLY`.
 *
 * ── Por qué este archivo tardó en existir ──
 *
 * `GET /api/v1/audio-therapy/status` está en el backend desde hace rato y **la app nunca lo
 * llamaba**. El efecto era que la Audioterapia caía en el selector genérico de evidencia y te
 * pedía una foto, un video o un texto para demostrar que escuchaste… un audio que la app no te
 * mostraba en ninguna parte. El aprendiz tenía que adivinar qué escuchar.
 *
 * ── Por qué NO se entrega por `/spirit-audio/submit` ──
 *
 * Sería lo intuitivo —la Pastilla Renacer hace justo eso— y está **mal**: ese endpoint llama a
 * `completarPastillaRenacer.completarDeHoy(...)`, que resuelve el hábito por la constante
 * `CLAVE_SISTEMA_PASTILLA_RENACER` y no recibe cuál completar. Usarlo acá marcaría completada la
 * PASTILLA, otorgaría sus puntos y dejaría la Audioterapia sin completar.
 *
 * El camino correcto es el genérico, y es el que el propio backend documenta en
 * `AudioterapiaService`: *"el hábito AUDIOTERAPIA SEMANAL (JOURNALING) ya se completa por el
 * camino genérico de RegistroService; esto solo le dice al aprendiz qué audio escuchar antes de
 * completar"*. O sea: este endpoint informa, y el cierre va por `evidenciaHabitoApi` como el de
 * cualquier otro hábito — con las respuestas como evidencia de TEXTO.
 */

/**
 * Los cuatro campos vienen `null` a la vez cuando todavía no hay contenido cargado para la semana
 * (`EsperandoContenido` del backend). No es un error: es un estado legítimo, y por eso el esquema
 * los acepta nullables en vez de rechazar la respuesta.
 */
const audioterapiaSchema = z.object({
  semana: z.number().int().nullable(),
  titulo: z.string().nullable(),
  url: z.string().nullable(),
  diaSiguienteCambio: z.number().int().nullable(),
});

/** El audio de la semana, ya resuelto: o hay uno con su URL, o todavía no lo cargaron. */
export type AudioterapiaSemanal =
  | { estado: 'con_audio'; semana: number; titulo: string; url: string; diaSiguienteCambio: number | null }
  | { estado: 'esperando_contenido' };

/**
 * Normaliza la respuesta a algo que la pantalla pueda ramificar sin repetir cuatro `!= null`.
 *
 * **Lo que decide que hay audio es la `url`**, no la semana ni el título: sin URL no hay nada que
 * reproducir, y una tarjeta con título y sin sonido sería peor que no mostrar nada.
 */
export function aAudioterapiaSemanal(crudo: z.infer<typeof audioterapiaSchema>): AudioterapiaSemanal {
  if (!crudo.url || crudo.semana === null) return { estado: 'esperando_contenido' };
  return {
    estado: 'con_audio',
    semana: crudo.semana,
    titulo: crudo.titulo ?? `Semana ${crudo.semana}`,
    url: crudo.url,
    diaSiguienteCambio: crudo.diaSiguienteCambio,
  };
}

/** `GET /api/v1/audio-therapy/status`. Exclusivo de TRAINEE, como el de Espíritu. */
export async function obtenerAudioterapiaSemanal(): Promise<AudioterapiaSemanal> {
  const r = await apiFetch<unknown>('/api/v1/audio-therapy/status');
  return aAudioterapiaSemanal(
    validarRespuesta(audioterapiaSchema, r, 'GET /api/v1/audio-therapy/status')
  );
}
