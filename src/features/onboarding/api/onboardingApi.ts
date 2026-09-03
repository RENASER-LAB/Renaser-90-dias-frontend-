import { apiFetch } from '../../../services/http/apiClient';
import type {
  ActivarProgramaApi,
  ActivarProgramaInput,
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

/**
 * `PUT` directo a S3 con la URL prefirmada — nunca pasa por este backend. Por eso NO usa
 * `apiFetch`: ni la `BASE_URL` del backend Java ni el header de sesión `X-Auth-Token`
 * corresponden acá, y el `Content-Type` tiene que ser EXACTAMENTE el que se firmó del lado del
 * servidor o S3 rechaza la firma con 403 (mismo motivo que `wallApi.subirImagenAS3`).
 *
 * <p>Bug encontrado 2026-09-03: usar `.blob()` para leer el archivo local y mandar ESE `Blob`
 * como body deja que React Native decida el `Content-Type` real a partir del `type` propio del
 * Blob (a veces vacío, a veces distinto de lo firmado) — pisando el header explícito de abajo.
 * `.arrayBuffer()` no carga ningún metadato de tipo, así que RN no tiene de dónde inferir un
 * `Content-Type` propio y respeta el header explícito, que es el que S3 espera.
 */
export async function subirArchivoOnboardingAS3(uploadUrl: string, uri: string, mimeType: string): Promise<void> {
  let bytes: ArrayBuffer;
  try {
    bytes = await (await fetch(uri)).arrayBuffer();
  } catch (error) {
    // Distingue "no se pudo leer el archivo local" (uri de captureRef, problema del dispositivo)
    // de "S3 rechazó la subida" (problema de red/credenciales) — mismo mensaje genérico en la
    // pantalla, pero el `cause` deja el diagnóstico correcto en el warning de la consola.
    throw new Error('No se pudo leer el archivo de la firma en el dispositivo.', { cause: error });
  }
  const respuesta = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: bytes,
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
