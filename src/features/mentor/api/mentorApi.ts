import { ApiError, apiFetch } from '../../../services/http/apiClient';
import type { MiCelula } from '../types/mentor.types';
import { miCelulaSchema, validarRespuesta } from './mentorSchemas';

/**
 * `GET /api/v1/mentor/celula` — la célula del mentor y sus aprendices.
 *
 * **Este endpoint todavía no existe en el backend.** Lo que sí existe es todo lo que
 * necesita para armarse: `renaser.celulas` (nombre, mentor, cohorte, próxima sesión) y
 * `renaser.participantes_programa` (`mentor_id`, `celula_id`, `dia_programa`). El único
 * endpoint bajo `/api/v1/mentor` hoy es `activate-tracking`.
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
