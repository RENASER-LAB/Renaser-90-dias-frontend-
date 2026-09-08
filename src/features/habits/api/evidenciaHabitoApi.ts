import { z } from 'zod';
import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from './habitsSchemas';

/**
 * Camino GENÉRICO de evidencia de hábitos: los que no tienen flujo propio (Clase Diaria, Post
 * Diario en Comunidad, Pastilla Renacer, Audioterapia). Con cumplir UNA de las cuatro formas
 * —foto, texto, audio o video— el hábito queda registrado.
 *
 * Archivo aparte de `habitsApi.ts` a propósito: ahí vive el plan (catálogo, preferencias,
 * horarios) y acá el registro del día con su evidencia, que es lo único que sube bytes.
 *
 * Son TRES pasos contra el backend Java, en este orden:
 *
 *   1. `POST /api/v1/habit-tracks/{id}/evidence/upload-url` → `{uploadUrl, bucket, ruta}`
 *   2. `PUT` crudo a `uploadUrl` (directo a S3, NO pasa por el backend)
 *   3. `POST /api/v1/habit-tracks/{id}/evidence` mandando `bucket` + `rutaStorage`
 *   4. `POST /api/v1/habit-tracks/{id}/complete` — el que otorga los puntos
 *
 * La evidencia de tipo TEXTO se saltea 1 y 2: va directo al paso 3 con `contenidoTexto`.
 *
 * **Los puntos no se mandan desde acá y no se pueden mandar**: `CompletarRegistroRequest` del
 * backend no tiene campo `puntos` (CLAUDE.MD §5.3.3, "el otorgamiento SIEMPRE lo calcula el
 * servidor"). El móvil lee `puntosOtorgados` de la respuesta y muestra lo que el servidor
 * concedió — nunca un número propio.
 */

/** Espejo de `evidence.api.TipoEvidencia` del backend. */
export type TipoEvidencia = 'FOTO' | 'VIDEO' | 'AUDIO' | 'TEXTO' | 'CAPTURA';

const urlSubidaEvidenciaSchema = z
  .object({
    uploadUrl: z.string(),
    bucket: z.string(),
    ruta: z.string(),
  })
  .passthrough();

const evidenciaRegistradaSchema = z
  .object({
    id: z.string(),
    estadoValidacion: z.string(),
  })
  .passthrough();

const registroCompletadoSchema = z
  .object({
    id: z.string(),
    estado: z.string(),
    puntosOtorgados: z.number(),
    respuestaTexto: z.string().nullable(),
    completadoEn: z.string().nullable(),
  })
  .passthrough();

export type UrlSubidaEvidencia = z.infer<typeof urlSubidaEvidenciaSchema>;
export type EvidenciaRegistrada = z.infer<typeof evidenciaRegistradaSchema>;
export type RegistroCompletado = z.infer<typeof registroCompletadoSchema>;

/**
 * Paso 1 — URL PUT prefirmada de S3 para el archivo (foto, video, audio o captura).
 *
 * `tipoContenido` es el MIME exacto y tiene que ser EL MISMO que después viaja como
 * `Content-Type` del PUT: S3 firma el content-type, así que si no coinciden rechaza la subida
 * con un 403 que no dice por qué.
 */
export async function solicitarUrlSubidaEvidencia(
  registroId: string,
  tipoContenido: string,
): Promise<UrlSubidaEvidencia> {
  const r = await apiFetch<unknown>(`/api/v1/habit-tracks/${registroId}/evidence/upload-url`, {
    method: 'POST',
    body: { tipoContenido },
  });
  return validarRespuesta(
    urlSubidaEvidenciaSchema,
    r,
    'POST /api/v1/habit-tracks/{id}/evidence/upload-url',
  );
}

/**
 * Mientras el backend corra con `STORAGE_PROVEEDOR=noop` (que es como está hoy),
 * `NoOpAlmacenamientoAdapter` devuelve `about:blank#pendiente-s3/<ruta>` como `uploadUrl`. Un
 * PUT contra eso no sube nada y revienta con un error de red incomprensible. Se detecta ACÁ,
 * antes de intentar subir, para poder avisar con un mensaje que se entienda.
 *
 * Es la misma guardia que ya usa el Muro (`wallApi.almacenamientoSinConfigurar`); se replica en
 * vez de importarse para no atar `habits` a `community`.
 */
export const ALMACENAMIENTO_SIN_CONFIGURAR =
  'El almacenamiento de archivos (S3) todavía no está configurado en el servidor, así que la foto, el audio o el video no se pueden guardar. Puedes dejar tu evidencia por escrito mientras tanto, o avisarle al equipo técnico.';

export function almacenamientoSinConfigurar(uploadUrl: string): boolean {
  return !uploadUrl.startsWith('http://') && !uploadUrl.startsWith('https://');
}

/**
 * Paso 2 — PUT directo a S3. Deliberadamente NO usa `apiFetch`: ése antepone la BASE_URL del
 * backend y agrega el header de sesión `X-Auth-Token`, y ninguna de las dos cosas corresponde
 * acá (mandarle el token de sesión a S3 no tiene sentido). Mismo criterio que
 * `wallApi.subirImagenAS3`.
 */
export async function subirArchivoAS3(
  uploadUrl: string,
  uri: string,
  mimeType: string,
): Promise<void> {
  // D-104: `.arrayBuffer()`, nunca `.blob()`. Con un `Blob` de React Native como cuerpo, RN
  // decide el `Content-Type` real a partir del `type` del Blob (a veces vacio, a veces distinto
  // del firmado) y pisa el header explicito de abajo; la URL prefirmada esta atada a ese header
  // exacto y S3 rechaza con 403 — la subida "fallaba" sin motivo visible. Es el mismo bug que
  // ya se habia encontrado y corregido en la firma del onboarding el 2026-09-03
  // (`subirArchivoOnboardingAS3`); este archivo habia copiado el patron viejo.
  let bytes: ArrayBuffer;
  try {
    bytes = await (await fetch(uri)).arrayBuffer();
  } catch (error) {
    throw new Error('No se pudo leer el archivo de la evidencia en el dispositivo.', { cause: error });
  }
  const respuesta = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: bytes,
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo subir la evidencia al almacenamiento (S3 respondió ${respuesta.status}).`);
  }
}

/**
 * Paso 3 — confirma la evidencia contra el backend. Se manda la `ruta` que devolvió el paso 1,
 * NUNCA la `uploadUrl`: ésa lleva firma y vencimiento, y guardarla en base deja un link que a
 * los diez minutos no abre.
 */
export async function confirmarEvidencia(
  registroId: string,
  evidencia: {
    tipo: TipoEvidencia;
    bucket?: string | null;
    rutaStorage?: string | null;
    contenidoTexto?: string | null;
  },
): Promise<EvidenciaRegistrada> {
  const r = await apiFetch<unknown>(`/api/v1/habit-tracks/${registroId}/evidence`, {
    method: 'POST',
    body: {
      tipo: evidencia.tipo,
      bucket: evidencia.bucket ?? null,
      rutaStorage: evidencia.rutaStorage ?? null,
      contenidoTexto: evidencia.contenidoTexto ?? null,
      timestampExif: null,
      gpsLat: null,
      gpsLng: null,
    },
  });
  return validarRespuesta(evidenciaRegistradaSchema, r, 'POST /api/v1/habit-tracks/{id}/evidence');
}

/**
 * Paso 4 — cierra el registro del día. Es ESTE endpoint el que otorga los puntos, no el de
 * evidencia: subir la prueba y completar son dos operaciones distintas del backend
 * (`EvidenciaRegistroService` no toca puntos; `RegistroService.completar` sí).
 */
export async function completarRegistro(
  registroId: string,
  respuestaTexto?: string | null,
): Promise<RegistroCompletado> {
  const r = await apiFetch<unknown>(`/api/v1/habit-tracks/${registroId}/complete`, {
    method: 'POST',
    body: {
      respuestaTexto: respuestaTexto?.trim() ? respuestaTexto.trim() : null,
      calificacionProductividad: null,
    },
  });
  return validarRespuesta(registroCompletadoSchema, r, 'POST /api/v1/habit-tracks/{id}/complete');
}
