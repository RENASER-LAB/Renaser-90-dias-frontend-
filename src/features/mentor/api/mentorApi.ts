import { ApiError, apiFetch } from '../../../services/http/apiClient';
import type { MiCelula } from '../types/mentor.types';
import { miCelulaSchema, validarRespuesta } from './mentorSchemas';

/**
 * `GET /api/v1/mentor/celula` — la célula del mentor y sus aprendices.
 *
 * **Este endpoint todavía no existe**, pero falta menos de lo que parece. Revisado el backend
 * el 2026-09-09, esto es lo que ya hay:
 *
 * - `GET /api/v1/admin/cells/{id}` **ya funciona para un mentor** y devuelve `members`. Su
 *   guard dice literalmente «un MENTOR pasa igual, pero solo sobre la celula que lidera».
 * - `GET /api/v1/admin/cells?cohortId=…` lo mismo, acotado a la que lidera.
 * - `GET /api/v1/admin/cells/dashboard` **no**: `CelulaService.dashboard` llama a
 *   `requireAdmin(actorId)`.
 *
 * O sea: un mentor puede leer su célula **si ya sabe su id o su cohorte**, y no tiene forma de
 * averiguar ninguno de los dos. Ese es el hueco entero.
 *
 * **`/api/v1/me/cell` NO sirve**, aunque el comentario de `CelulaService` diga que sí («un
 * MENTOR sigue viendo la propia por GET /me/cell»). Ese comentario contradice a su propia
 * implementación: `miCelula()` resuelve por `celulaDeUsuario()`, que va a
 * `participacionFinder.deParticipante()` — solo `participantes_programa`. Un mentor no es
 * participante de la célula que acompaña, la lidera vía `celulas.mentor_id`, así que recibe
 * `{assigned:false}`. Son dos preguntas distintas: «¿de qué célula soy miembro?» y «¿qué
 * célula acompaño?».
 *
 * Lo más barato de implementar, entonces, es una de estas dos:
 *   1. Abrir `/dashboard` a MENTOR filtrando por `celulas.mentor_id = actor`.
 *   2. Este endpoint, que además puede traer ya el progreso de cada aprendiz
 *      (`participantes_programa.dia_programa`) y ahorrar una segunda llamada.
 *
 * El contrato se escribe aquí, contra ese esquema real, para que el día que se implemente
 * no haya que tocar ni las pantallas ni los hooks — solo comprobar que la forma coincide,
 * que es justo lo que hace el esquema zod de al lado.
 *
 * Mientras no exista, la llamada devuelve 404 y `esNoDisponible` lo distingue de un fallo de
 * red o de un permiso denegado. La pantalla dice cuál de las tres cosas pasó: los tres se
 * arreglan de manera distinta y colapsarlos en "algo salió mal" no ayuda a nadie.
 */
export async function obtenerMiCelula(): Promise<MiCelula> {
  const r = await apiFetch<unknown>('/api/v1/mentor/celula');
  return validarRespuesta(miCelulaSchema, r, 'GET /api/v1/mentor/celula');
}

/** El endpoint todavía no está desplegado (404), frente a "falló la red" o "no autorizado". */
export function esNoDisponible(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Sin permiso de mentor sobre esa célula. */
export function esProhibido(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

/** No hubo respuesta: backend apagado, sin red, URL mal puesta. */
export function esDeRed(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}
