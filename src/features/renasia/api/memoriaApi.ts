import { ApiError, apiFetch } from '../../../services/http/apiClient';
import type { MemoriaRenasiaApi } from '../types/renasia.types';
import { renasiaSchemas, validarRespuesta } from './renasiaSchemas';

/**
 * La memoria del acompañante (D-167): lo que Renasia aprendió de la persona, que ella ve y borra
 * desde su perfil. Acá solo vive el "cómo se llama"; qué mostrar y cuándo recargar es de
 * `hooks/useMemoriaDeRenasia`.
 */

const MEMORIA = '/api/v1/renasia/memoria';

/** `GET /api/v1/renasia/memoria` — lo propio; el backend saca a la persona de la sesión. */
export async function obtenerMemoriaRenasia(): Promise<MemoriaRenasiaApi> {
  const r = await apiFetch<unknown>(MEMORIA);
  return validarRespuesta<MemoriaRenasiaApi>(renasiaSchemas.memoria, r, `GET ${MEMORIA}`);
}

/**
 * `DELETE /api/v1/renasia/memoria/recuerdos/{id}` — 204. En el servidor borra también el resumen,
 * que podía nombrar lo borrado: después hay que volver a pedir la memoria, no sacar el ítem a mano.
 *
 * Un 404 es que ya no estaba (se borró en otro teléfono, o la memoria se reacomodó mientras la
 * pantalla estaba abierta): para la persona el resultado es el mismo, así que no es un error.
 */
export async function olvidarRecuerdoRenasia(id: string): Promise<void> {
  try {
    await apiFetch<void>(`${MEMORIA}/recuerdos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return;
    throw error;
  }
}

/** `DELETE /api/v1/renasia/memoria` — 204: recuerdos y resumen. Lo conversado hasta ahora no vuelve. */
export async function olvidarTodoRenasia(): Promise<void> {
  await apiFetch<void>(MEMORIA, { method: 'DELETE' });
}
