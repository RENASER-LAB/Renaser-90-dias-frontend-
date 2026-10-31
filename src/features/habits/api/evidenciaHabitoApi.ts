import { z } from 'zod';
import { avisarHabitoCumplido } from '../eventos/habitoCumplido';
import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from './habitsSchemas';
import { ejecutarEnRegistroVigente } from './registroVigente';
import { enPasoDelEnvio } from '../utils/enPasoDelEnvio';

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
  const r = await ejecutarEnRegistroVigente(registroId, () =>
    apiFetch<unknown>(`/api/v1/habit-tracks/${registroId}/evidence/upload-url`, {
      method: 'POST',
      body: { tipoContenido },
    }),
  );
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

/** Pausas entre los intentos del PUT a S3 cuando falla la red (ver {@link ponerElArchivoEnS3}). */
export const ESPERAS_ENTRE_INTENTOS_DEL_PUT_MS: readonly number[] = [500, 1500];

const esperar = (ms: number) => new Promise<void>(resolver => setTimeout(resolver, ms));

/**
 * El PUT, con hasta {@link ESPERAS_ENTRE_INTENTOS_DEL_PUT_MS}.length reintentos EN EL MISMO ENVÍO. Se repite solo lo que puede
 * ser pasajero: la red que se cae a mitad (la excepción de `fetch`, una conexión vieja que el teléfono reutiliza después de
 * perder la señal) y un 5xx de S3. Un 4xx (firma vencida, `Content-Type` distinto) no mejora repitiéndolo y sale de una vez.
 * Cada intento manda el MISMO cuerpo a la MISMA dirección firmada: un PUT a S3 es idempotente.
 */
async function ponerElArchivoEnS3(
  uploadUrl: string,
  bytes: ArrayBuffer,
  mimeType: string,
  esperasMs: readonly number[],
): Promise<void> {
  let ultimoFallo: unknown;
  for (let intento = 0; intento <= esperasMs.length; intento++) {
    if (intento > 0) await esperar(esperasMs[intento - 1]);
    let respuesta: Response;
    try {
      respuesta = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: bytes,
      });
    } catch (error) {
      ultimoFallo = error;
      if (intento < esperasMs.length) console.warn(`[evidencia] el PUT a S3 falló (intento ${intento + 1}); se repite:`, error);
      continue;
    }
    if (respuesta.ok) return;
    const rechazo = new Error(`No se pudo subir la evidencia al almacenamiento (S3 respondió ${respuesta.status}).`);
    if (respuesta.status < 500) throw rechazo;
    ultimoFallo = rechazo;
  }
  throw ultimoFallo;
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
  esperasMs: readonly number[] = ESPERAS_ENTRE_INTENTOS_DEL_PUT_MS,
): Promise<void> {
  // D-104: `.arrayBuffer()`, nunca `.blob()`. Con un `Blob` de React Native como cuerpo, RN
  // decide el `Content-Type` real a partir del `type` del Blob (a veces vacio, a veces distinto
  // del firmado) y pisa el header explicito de abajo; la URL prefirmada esta atada a ese header
  // exacto y S3 rechaza con 403 — la subida "fallaba" sin motivo visible. Es el mismo bug que
  // ya se habia encontrado y corregido en la firma del onboarding el 2026-09-03
  // (`subirArchivoOnboardingAS3`); este archivo habia copiado el patron viejo.
  const bytes = await enPasoDelEnvio('leer el archivo', async () => {
    try {
      const leido = await fetch(uri);
      // Desde Expo 57 el `fetch` global lee `file://` por OkHttp, y un archivo que ya no está NO lanza: responde un 404 con
      // el texto «File not found». Sin este control esos 14 bytes se subían a S3 como si fueran la foto (#51).
      if (!leido.ok) throw new Error(`el archivo respondió ${leido.status}`);
      return await leido.arrayBuffer();
    } catch (error) {
      throw new Error('No se pudo leer el archivo de la evidencia en el dispositivo.', { cause: error });
    }
  });
  await enPasoDelEnvio('subir a S3', () => ponerElArchivoEnS3(uploadUrl, bytes, mimeType, esperasMs));
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
  const r = await ejecutarEnRegistroVigente(registroId, () =>
    apiFetch<unknown>(`/api/v1/habit-tracks/${registroId}/evidence`, {
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
    }),
  );
  return validarRespuesta(evidenciaRegistradaSchema, r, 'POST /api/v1/habit-tracks/{id}/evidence');
}

/**
 * El servidor no tiene dónde guardar archivos (ver {@link almacenamientoSinConfigurar}). Tipo
 * propio para que quien no puede ofrecer "déjalo por escrito" (el registro con foto) muestre su
 * propio texto; el mensaje por defecto es el de siempre.
 */
export class AlmacenamientoSinConfigurarError extends Error {
  constructor() {
    super(ALMACENAMIENTO_SIN_CONFIGURAR);
    this.name = 'AlmacenamientoSinConfigurarError';
  }
}

/** Lo mínimo que hace falta de un archivo para subirlo (un `ArchivoEvidencia` lo cumple). */
export type ArchivoParaSubir = { uri: string; mimeType: string; tipo: TipoEvidencia };

/**
 * Pasos 1 a 3 en orden: firmar, subir a S3 y confirmar la evidencia. NO completa el registro.
 *
 * Extraído del `sellar` de `EvidenciaHabitoModal` (2026-09-26) para que el modal genérico y el
 * registro con foto (Training, la tarjeta del chat y la del orbe) suban por el MISMO código.
 * Resuelve recién cuando el backend confirmó la evidencia: desde ahí, repetir estos pasos
 * crearía una evidencia duplicada, y quien llama lo sabe.
 */
export async function subirEvidenciaDeArchivo(
  registroId: string,
  archivo: ArchivoParaSubir,
): Promise<EvidenciaRegistrada> {
  const url = await enPasoDelEnvio('pedir la dirección de subida', () =>
    solicitarUrlSubidaEvidencia(registroId, archivo.mimeType),
  );
  if (almacenamientoSinConfigurar(url.uploadUrl)) {
    throw new AlmacenamientoSinConfigurarError();
  }
  await subirArchivoAS3(url.uploadUrl, archivo.uri, archivo.mimeType);
  return enPasoDelEnvio('confirmar la evidencia', () =>
    confirmarEvidencia(registroId, {
      tipo: archivo.tipo,
      bucket: url.bucket,
      rutaStorage: url.ruta,
    }),
  );
}

/**
 * Paso 4 — cierra el registro del día. Es ESTE endpoint el que otorga los puntos, no el de
 * evidencia: subir la prueba y completar son dos operaciones distintas del backend
 * (`EvidenciaRegistroService` no toca puntos; `RegistroService.completar` sí).
 *
 * `valorMedido` (D-226): los km del día de KILÓMETROS DIARIOS, ya leídos como número con punto
 * decimal. Solo viaja cuando hay uno: un hábito que no mide nada lo rechaza con un 400.
 */
export async function completarRegistro(
  registroId: string,
  respuestaTexto?: string | null,
  valorMedido?: number | null,
): Promise<RegistroCompletado> {
  let habitoId: string | undefined;
  let fecha: string | undefined;
  const r = await ejecutarEnRegistroVigente(registroId, track => {
    habitoId = track?.habitoId;
    fecha = track?.fechaEjecucion;
    return apiFetch<unknown>(`/api/v1/habit-tracks/${registroId}/complete`, {
      method: 'POST',
      body: {
        respuestaTexto: respuestaTexto?.trim() ? respuestaTexto.trim() : null,
        calificacionProductividad: null,
        ...(valorMedido != null ? { valorMedido } : {}),
      },
    });
  });
  const completado = validarRespuesta(registroCompletadoSchema, r, 'POST /api/v1/habit-tracks/{id}/complete');
  avisarHabitoCumplido({
    registroId,
    puntosOtorgados: completado.puntosOtorgados,
    // Spec 009: de qué hábito es, para cancelar las repeticiones de su alarma de hoy. Sin dato, no se manda la clave.
    ...(habitoId ? { habitoId } : {}),
    // Issue #33: el día del hábito (puede no ser «hoy» del reloj: Dormir cumplido pasada la medianoche).
    ...(fecha ? { fecha } : {}),
  });
  return completado;
}
