import { apiFetch } from '../../../services/http/apiClient';
import type { ClaseDiariaApi, CompletarClaseDiariaApi } from '../types/academy.types';
import { academySchemas, validarRespuesta } from './academySchemas';

/**
 * Endpoints de `ClaseDiariaController` (backend Java). Mismo criterio que `leccionesApi.ts`: acá
 * solo el "cómo se llama", sin reglas de pantalla.
 *
 * Qué resuelve esto y por qué no alcanza con `habit-tracks`: la Clase Diaria es UN hábito de
 * catálogo (`claveSistema = 'DAILY_CLASS'`) que además tiene una lección asociada. Completarla son
 * DOS escrituras — cerrar el registro del hábito (puntos, racha, ventana de entrega) y marcar la
 * lección como vista — y el backend las hace juntas, en una sola transacción, detrás de este
 * único POST. Por eso este hábito NO se completa con `POST /api/v1/habit-tracks/{id}/complete`
 * como los demás: ese camino cerraría el registro sin marcar la lección ni exigir el resumen.
 */

/**
 * GET /api/v1/classroom/clase-diaria — qué clase le toca HOY a este aprendiz.
 *
 * Sin parámetros a propósito: el `programDay` lo resuelve el servidor leyendo `dia_programa`, el
 * móvil nunca lo manda ni lo elige.
 */
export async function obtenerClaseDiaria(): Promise<ClaseDiariaApi> {
  const r = await apiFetch<unknown>('/api/v1/classroom/clase-diaria');
  return validarRespuesta(academySchemas.claseDiaria, r, 'GET /api/v1/classroom/clase-diaria');
}

/**
 * POST /api/v1/classroom/clase-diaria — cierra la Clase Diaria de hoy con el resumen de lo que la
 * persona entendió.
 *
 * El `leccionId` viaja pero NO decide nada: el servidor vuelve a resolver cuál es la clase de hoy
 * y responde 403 si no coincide. Va igual porque el backend lo usa como chequeo de coincidencia
 * (que el móvil no mande el resumen de una clase mirando otra).
 *
 * Idempotente: repetir la llamada devuelve el resultado ya otorgado sin volver a sumar puntos.
 */
export async function completarClaseDiaria(
  leccionId: string,
  resumen: string,
): Promise<CompletarClaseDiariaApi> {
  const r = await apiFetch<unknown>('/api/v1/classroom/clase-diaria', {
    method: 'POST',
    body: { leccionId, resumen },
  });
  return validarRespuesta(
    academySchemas.completarClaseDiaria,
    r,
    'POST /api/v1/classroom/clase-diaria',
  );
}

/**
 * Límites del resumen. Los fija el backend (`CompletarClaseDiariaHabitoUseCase.RESUMEN_MIN_LENGTH`
 * / `RESUMEN_MAX_LENGTH`) y se repiten acá para poder avisar ANTES de mandar, en vez de que la
 * persona escriba y reciba un 400. Si cambian allá, cambian acá: son el mismo contrato.
 */
export const RESUMEN_MIN_LENGTH = 15;
export const RESUMEN_MAX_LENGTH = 2000;
