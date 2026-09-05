import { apiFetch } from '../../../services/http/apiClient';
import type {
  ActivarProgramaApi,
  ActivarProgramaInput,
  CuestionarioApi,
  EstadoActivacionProgramaApi,
  EstadoOnboardingApi,
  AvanzarEstadoInput,
  GuardarRespuestaInput,
  HitoOnboarding,
  MediaOnboardingApi,
  RegistrarMediaInput,
  RespuestaApi,
  RespuestasAgrupadasApi,
  SolicitarUrlSubidaMediaInput,
  UrlSubidaMediaOnboardingApi,
} from '../types/onboarding.types';
import {
  activarProgramaSchema,
  cuestionarioSchema,
  estadoActivacionProgramaSchema,
  estadoOnboardingSchema,
  mediaOnboardingSchema,
  respuestaSchema,
  respuestasAgrupadasSchema,
  urlSubidaMediaOnboardingSchema,
  validarRespuesta,
} from './onboardingSchemas';

/**
 * Endpoints de `EstadoOnboardingController` (backend Java). Acá solo vive el "cómo se llama":
 * qué hacer con la respuesta (decidir si mostrar el flujo de onboarding o el Home) es de
 * `features/auth/context/AuthContext.tsx` — mismo criterio que `academy/api/cursosApi.ts`.
 */

/**
 * GET /api/v1/onboarding/state — `completed` es lo que usa `AuthContext` para decidir si
 * `RootNavigator` muestra `OnboardingFlow` o `MainTabs`. Requiere `Permission.USE_APP`: el
 * backend responde 403 específicamente para una cuenta SUSPENDED (ver
 * `EstadoOnboardingService.requireActorActivo`, backend) — no es un permiso de rol distinto, es
 * el mismo chequeo de cuenta activa que exige el resto de la API.
 */
export async function obtenerEstado(): Promise<EstadoOnboardingApi> {
  const r = await apiFetch<unknown>('/api/v1/onboarding/state');
  return validarRespuesta<EstadoOnboardingApi>(estadoOnboardingSchema, r, 'GET /api/v1/onboarding/state');
}

/**
 * POST /api/v1/onboarding/complete — marca el onboarding como terminado en el backend. Idempotente
 * del lado del servidor (completar dos veces conserva la primera fecha), así que no hace falta
 * guardia acá contra llamadas repetidas.
 */
/**
 * GET /api/v1/onboarding/activate-program — las fechas válidas para arrancar el Día 1 (mañana,
 * +2 o +3 en la zona del aprendiz — nunca hoy, ver `ParticipacionPrograma.activarPrograma` en el
 * backend). `validStartDates` viene vacío si el programa ya está activado.
 */
export async function consultarActivacionPrograma(): Promise<EstadoActivacionProgramaApi> {
  const r = await apiFetch<unknown>('/api/v1/onboarding/activate-program');
  return validarRespuesta<EstadoActivacionProgramaApi>(
    estadoActivacionProgramaSchema,
    r,
    'GET /api/v1/onboarding/activate-program'
  );
}

/**
 * POST /api/v1/onboarding/activate-program — confirma el Día 1 con una de las fechas devueltas por
 * `consultarActivacionPrograma`. Reintentar con la MISMA fecha ya activada es un no-op (200); con
 * una fecha distinta el backend responde 409 (`ApiError.esConflicto`).
 */
export async function activarPrograma(input: ActivarProgramaInput): Promise<ActivarProgramaApi> {
  const r = await apiFetch<unknown>('/api/v1/onboarding/activate-program', { method: 'POST', body: input });
  return validarRespuesta<ActivarProgramaApi>(activarProgramaSchema, r, 'POST /api/v1/onboarding/activate-program');
}

export async function completarOnboarding(): Promise<EstadoOnboardingApi> {
  const r = await apiFetch<unknown>('/api/v1/onboarding/complete', { method: 'POST' });
  return validarRespuesta<EstadoOnboardingApi>(estadoOnboardingSchema, r, 'POST /api/v1/onboarding/complete');
}

/**
 * POST /api/v1/onboarding/answers — guarda UNA respuesta. Upsert por (usuario, pregunta): mandarla
 * de nuevo actualiza, nunca duplica (ver javadoc de `Respuesta.actualizarValor`, backend), así que
 * reintentar tras un fallo de red es seguro.
 */
export async function guardarRespuesta(input: GuardarRespuestaInput): Promise<RespuestaApi> {
  const r = await apiFetch<unknown>('/api/v1/onboarding/answers', { method: 'POST', body: input });
  return validarRespuesta<RespuestaApi>(respuestaSchema, r, 'POST /api/v1/onboarding/answers');
}

/**
 * GET /api/v1/onboarding/answers — respuestas ya guardadas del actor para un flujo, agrupadas por
 * sección (hidratar onboarding a medio terminar, según el javadoc de `RespuestaController`, backend).
 */
export async function obtenerRespuestas(flow: string): Promise<RespuestasAgrupadasApi> {
  const r = await apiFetch<unknown>(`/api/v1/onboarding/answers?flow=${encodeURIComponent(flow)}`);
  return validarRespuesta<RespuestasAgrupadasApi>(respuestasAgrupadasSchema, r, 'GET /api/v1/onboarding/answers');
}

/**
 * GET /api/v1/onboarding/questionnaire?flow=... — el catálogo REAL de preguntas de un flujo, con
 * el `id` que hoy tiene cada `questionKey` en esta base de datos.
 *
 * Es la única fuente válida de esos `id`: ver `data/catalogoPreguntas.ts` para por qué no se
 * pueden hardcodear.
 */
export async function obtenerCuestionario(flow: string): Promise<CuestionarioApi> {
  const r = await apiFetch<unknown>(`/api/v1/onboarding/questionnaire?flow=${encodeURIComponent(flow)}`);
  return validarRespuesta<CuestionarioApi>(cuestionarioSchema, r, 'GET /api/v1/onboarding/questionnaire');
}

/**
 * PUT /api/v1/onboarding/state — mueve el cursor de reanudación (flujo/sección/paso). Todos los
 * campos son opcionales: el backend deja sin tocar lo que no se manda (ver `EstadoOnboarding.avanzar`).
 */
export async function avanzarEstado(input: AvanzarEstadoInput): Promise<EstadoOnboardingApi> {
  const r = await apiFetch<unknown>('/api/v1/onboarding/state', { method: 'PUT', body: input });
  return validarRespuesta<EstadoOnboardingApi>(estadoOnboardingSchema, r, 'PUT /api/v1/onboarding/state');
}

/** POST /api/v1/onboarding/milestones — marca un hito de aceptación/firma (TERMINOS, PACTO, PACTO_FIRMADO, ROCAS_SYNC). */
export async function aceptarHito(milestone: HitoOnboarding): Promise<EstadoOnboardingApi> {
  const r = await apiFetch<unknown>('/api/v1/onboarding/milestones', { method: 'POST', body: { milestone } });
  return validarRespuesta<EstadoOnboardingApi>(estadoOnboardingSchema, r, 'POST /api/v1/onboarding/milestones');
}

/**
 * Pide la URL prefirmada de S3 para subir un archivo de onboarding (firma, y a futuro audio o
 * documento) — `MediaController.urlDeSubida`, POST /onboarding/media/upload-url. El `PUT` de los
 * bytes va aparte (`subirArchivoOnboardingAS3`), directo a S3, nunca a este backend. Mismo patrón
 * ya usado por el Muro (`wallApi.solicitarUrlSubidaMuro`).
 */
export async function solicitarUrlSubidaMediaOnboarding(
  input: SolicitarUrlSubidaMediaInput
): Promise<UrlSubidaMediaOnboardingApi> {
  const r = await apiFetch<unknown>('/api/v1/onboarding/media/upload-url', { method: 'POST', body: input });
  return validarRespuesta<UrlSubidaMediaOnboardingApi>(
    urlSubidaMediaOnboardingSchema,
    r,
    'POST /api/v1/onboarding/media/upload-url'
  );
}

/**
 * Mientras el backend no tenga el almacenamiento S3 configurado, el adaptador `NoOp` devuelve una
 * `uploadUrl` que no arranca con "http" (ver el mismo caso ya resuelto en
 * `wallApi.almacenamientoSinConfigurar`). Se detecta ACÁ, antes de intentar el `PUT`, para poder
 * avisar con un mensaje claro en vez de dejar que `fetch` reviente con un error de red críptico.
 */
export function almacenamientoOnboardingSinConfigurar(uploadUrl: string): boolean {
  return !uploadUrl.startsWith('http://') && !uploadUrl.startsWith('https://');
}

/** Cabecera de 8 bytes que TODO archivo PNG tiene al inicio (PNG


). */
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Un PNG real del lienzo de firma pesa varios KB. Este piso solo existe para descartar una captura
 * degenerada (lienzo de tamaño cero): en el bucket apareció un PNG válido de 67 bytes, de 1 píxel.
 */
const MINIMO_BYTES_PNG_FIRMA = 100;

/**
 * base64 -> bytes, sin depender de `atob`/`Buffer` (ninguno garantizado en React Native).
 *
 * El `?? 0` del último grupo no es cosmético: cuando el largo del PNG no es múltiplo de 3, el
 * base64 termina con relleno `=` que la limpieza de arriba descarta, y el grupo final queda con 2
 * o 3 caracteres. Sin ese `?? 0`, `indexOf(undefined)` devuelve **-1** y contamina los bits del
 * último byte — probado: un PNG de 67 bytes se decodificaba con el largo correcto pero con bytes
 * distintos del original.
 */
function base64ABytes(base64: string): Uint8Array {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const limpio = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const seis = (posicion: number) => {
    const indice = abc.indexOf(limpio[posicion] ?? '');
    return indice < 0 ? 0 : indice;
  };
  const bytes = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let salida = 0;
  for (let i = 0; i < limpio.length; i += 4) {
    const n = (seis(i) << 18) | (seis(i + 1) << 12) | (seis(i + 2) << 6) | seis(i + 3);
    bytes[salida++] = (n >> 16) & 0xff;
    if (salida < bytes.length) bytes[salida++] = (n >> 8) & 0xff;
    if (salida < bytes.length) bytes[salida++] = n & 0xff;
  }
  return bytes;
}

/**
 * `PUT` directo a S3 con la URL prefirmada — nunca pasa por este backend. Por eso NO usa
 * `apiFetch`: ni la `BASE_URL` del backend Java ni el header de sesión `X-Auth-Token`
 * corresponden acá, y el `Content-Type` tiene que ser EXACTAMENTE el que se firmó del lado del
 * servidor o S3 rechaza la firma con 403 (mismo motivo que `wallApi.subirImagenAS3`).
 *
 * <p>Recibe el PNG en **base64**, no una URI de archivo. Bug encontrado 2026-09-04 (E-97): con una
 * URI, en Android `fetch(uri).arrayBuffer()` devolvía —con status OK— 14 bytes con el texto
 * "File not found", y eso se subía a S3 como si fuera la firma. Ver el comentario largo en
 * `SignatureCanvas.capturarComoPngBase64`.
 *
 * <p>Antes de subir se verifica que los bytes sean de verdad un PNG y no una cáscara vacía. Es
 * barato y es lo que convierte "se guardó basura en silencio" en un error visible: una firma es
 * evidencia con valor probatorio, y subir algo que no se puede abrir es peor que no subir nada.
 */
export async function subirArchivoOnboardingAS3(
  uploadUrl: string,
  pngBase64: string,
  mimeType: string
): Promise<void> {
  const bytes = base64ABytes(pngBase64);

  if (bytes.length < MINIMO_BYTES_PNG_FIRMA || !FIRMA_PNG.every((b, i) => bytes[i] === b)) {
    // El mensaje no lleva los bytes ni la URL: solo el tamaño, que es lo único que sirve para
    // diagnosticar y no expone nada.
    throw new Error(
      `La captura de la firma no es un PNG válido (${bytes.length} bytes) — no se subió nada al almacenamiento.`
    );
  }

  const respuesta = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    // `bytes.buffer` (ArrayBuffer) y no el Uint8Array: es lo que acepta el tipo `BodyInit` de RN,
    // y es además lo que ya se mandaba antes de E-97 — el `Content-Type` explícito se respeta
    // igual, que es el motivo por el que no se usa un Blob (ver el comentario de arriba).
    body: bytes.buffer as ArrayBuffer,
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo subir el archivo al almacenamiento (S3 respondió ${respuesta.status}).`);
  }
}

/**
 * Registra el media ya subido a S3 — `MediaController.registrar`, POST /onboarding/media. El
 * `id` de la respuesta es el `mediaId` que después viaja en `GuardarRespuestaInput.mediaId`
 * (`POST /onboarding/answers`), tal como exige el dominio para preguntas tipo FIRMA (`SlotValor.SOLO_MEDIA`).
 */
export async function registrarMediaOnboarding(input: RegistrarMediaInput): Promise<MediaOnboardingApi> {
  const r = await apiFetch<unknown>('/api/v1/onboarding/media', { method: 'POST', body: input });
  return validarRespuesta<MediaOnboardingApi>(mediaOnboardingSchema, r, 'POST /api/v1/onboarding/media');
}
