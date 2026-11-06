import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';

/**
 * Spec 045 (D-330): el recorrido de bienvenida. El servidor recuerda en qué paso va y si ya terminó; `mostrar` lo decide él
 * (sin terminar, con programa propio activado y sin suspender, y nunca a una cuenta anterior al recorrido).
 */
export type ComoTermino = 'PUBLICO' | 'LISTO' | 'SALTO';

export type EstadoDelRecorrido = {
  mostrar: boolean;
  paso: number;
  terminado: boolean;
};

const respuestaSchema = z.object({
  mostrar: z.boolean().catch(false),
  paso: z.number().int().min(1).max(5).catch(1),
  terminadoEn: z.string().nullish().catch(null),
});

function leer(crudo: unknown): EstadoDelRecorrido {
  const r = respuestaSchema.parse(crudo ?? {});
  return { mostrar: r.mostrar, paso: r.paso, terminado: !!r.terminadoEn };
}

/** `GET /api/v1/me/recorrido`. Un 404 (backend anterior) lo trata quien llama: nunca se muestra sobre una duda. */
export async function obtenerRecorrido(): Promise<EstadoDelRecorrido> {
  return leer(await apiFetch<unknown>('/api/v1/me/recorrido'));
}

/** `PUT /api/v1/me/recorrido`: el paso al que llegó (1 a 5). */
export async function guardarPasoDelRecorrido(paso: number): Promise<EstadoDelRecorrido> {
  return leer(await apiFetch<unknown>('/api/v1/me/recorrido', { method: 'PUT', body: { paso } }));
}

/** `POST /api/v1/me/recorrido/terminar`. Idempotente en el servidor. */
export async function terminarRecorrido(como: ComoTermino): Promise<EstadoDelRecorrido> {
  return leer(await apiFetch<unknown>('/api/v1/me/recorrido/terminar', { method: 'POST', body: { como } }));
}
