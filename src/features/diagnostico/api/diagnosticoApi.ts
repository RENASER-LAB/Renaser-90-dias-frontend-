import { apiFetch } from '../../../services/http/apiClient';
import type {
  DiagnosticoParaLaPersona,
  EstadoDeMiDiagnostico,
  LecturaDelDiagnostico,
  ResultadoDeTerminar,
  ResumenDeMiDiagnostico,
  RespuestaDelDiagnostico,
} from '../types/diagnostico.types';
import {
  leerDiagnostico,
  leerEstadoDeMiDiagnostico,
  leerLecturaDelDiagnostico,
  leerResultadoDeTerminar,
  leerResumenDeMiDiagnostico,
} from './diagnosticoSchemas';

/**
 * El diagnóstico de la propia persona contra el servidor (spec 026, contrato §1 y §4). Aquí solo vive el «cómo se llama»; qué hacer con
 * cada respuesta es de los hooks y las pantallas. Todo se lee con tolerancia (`diagnosticoSchemas`): un backend anterior, que no tiene
 * estas rutas, responde 404 y quien llama lo trata como «sin diagnóstico».
 */
export const BASE_DIAGNOSTICO = '/api/v1/diagnostico/mio';

/** `GET …/estado`: ficha, estado y versión. Un backend anterior (404) o un cuerpo raro equivalen a «ficha estándar». */
export async function obtenerEstadoDeMiDiagnostico(): Promise<EstadoDeMiDiagnostico> {
  return leerEstadoDeMiDiagnostico(await apiFetch<unknown>(`${BASE_DIAGNOSTICO}/estado`, { timeoutMs: 15_000 }));
}

/**
 * `GET …`: abre el diagnóstico (la primera vez fija la versión de la persona). `null` si lo que llegó no es un diagnóstico.
 * 404: no lo tiene asignado o no hay versión publicada; 409: ya lo terminó.
 */
export async function abrirMiDiagnostico(): Promise<DiagnosticoParaLaPersona | null> {
  return leerDiagnostico(await apiFetch<unknown>(BASE_DIAGNOSTICO, { timeoutMs: 20_000 }));
}

/** `PUT …/respuestas`: guarda un paso entero. Una respuesta con todos los valores en null borra la anterior. */
export async function guardarRespuestasDelDiagnostico(respuestas: RespuestaDelDiagnostico[]): Promise<number> {
  const r = await apiFetch<{ guardadas?: number } | null>(`${BASE_DIAGNOSTICO}/respuestas`, {
    method: 'PUT',
    body: { respuestas },
    timeoutMs: 20_000,
  });
  return typeof r?.guardadas === 'number' ? r.guardadas : respuestas.length;
}

/**
 * `POST …/terminar`: valida, marca terminado y prepara los objetivos de Plan. Un 400 con `codigo: DIAGNOSTICO_INCOMPLETO` trae
 * `faltan: number[]` en el cuerpo del `ApiError`.
 */
export async function terminarMiDiagnostico(): Promise<ResultadoDeTerminar> {
  return leerResultadoDeTerminar(await apiFetch<unknown>(`${BASE_DIAGNOSTICO}/terminar`, { method: 'POST', timeoutMs: 30_000 }));
}

/** `GET …/resumen`: lo que lee Plan (prioridad, primera acción y objetivos). Nunca falla por «no lo tiene». */
export async function obtenerResumenDeMiDiagnostico(): Promise<ResumenDeMiDiagnostico> {
  return leerResumenDeMiDiagnostico(await apiFetch<unknown>(`${BASE_DIAGNOSTICO}/resumen`, { timeoutMs: 15_000 }));
}

/** `GET …/lectura`: su propio diagnóstico en solo lectura (Yo → Mi diagnóstico). */
export async function obtenerLecturaDeMiDiagnostico(): Promise<LecturaDelDiagnostico> {
  return leerLecturaDelDiagnostico(await apiFetch<unknown>(`${BASE_DIAGNOSTICO}/lectura`, { timeoutMs: 15_000 }));
}

/** El `faltan` de un `DIAGNOSTICO_INCOMPLETO` (ids de las preguntas obligatorias visibles sin responder). */
export function preguntasQueFaltan(cuerpo: unknown): number[] {
  const faltan = (cuerpo as { faltan?: unknown } | null)?.faltan;
  return Array.isArray(faltan) ? faltan.filter((id): id is number => typeof id === 'number') : [];
}
