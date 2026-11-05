import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import type { CuerpoDeLaCarrera, RespuestaDeLaCarrera } from '../types/carrera.types';

/**
 * `POST /api/v1/carreras` (spec 042, contracts/api.md §1): la ÚNICA escritura de una carrera. La clave de idempotencia es la
 * `carreraId` del cuerpo: repetir el mismo pedido devuelve 200 con `repetida: true` y lo mismo de la primera vez, sin km ni
 * puntos de más. Durante la carrera no se llama a nada (FR-004): esto solo corre al terminar y desde la cola.
 *
 * El esquema es tolerante: un campo de más o un `habito` que no se entiende no tumba el éxito (la carrera ya quedó guardada).
 */

const respuestaSchema = z
  .object({
    carreraId: z.string(),
    repetida: z.boolean().catch(false),
    fecha: z.string().nullish(),
    kilometros: z.number().catch(0),
    cuentaParaElHabito: z.boolean().catch(true),
    porRevisar: z.boolean().catch(false),
    habito: z
      .object({
        resultado: z.string(),
        registroId: z.string().nullish(),
        kilometrosDelDia: z.number().nullish(),
        puntosOtorgados: z.number().catch(0),
      })
      .passthrough()
      .nullish()
      .catch(null),
  })
  .passthrough();

export function leerRespuestaDeLaCarrera(crudo: unknown, carreraId: string): RespuestaDeLaCarrera {
  const r = respuestaSchema.safeParse(crudo);
  if (!r.success) {
    return { carreraId, repetida: false, fecha: null, kilometros: 0, cuentaParaElHabito: true, porRevisar: false, habito: null };
  }
  const d = r.data;
  return {
    carreraId: d.carreraId,
    repetida: d.repetida,
    fecha: d.fecha ?? null,
    kilometros: d.kilometros,
    cuentaParaElHabito: d.cuentaParaElHabito,
    porRevisar: d.porRevisar,
    habito: d.habito
      ? {
          resultado: d.habito.resultado,
          registroId: d.habito.registroId ?? null,
          kilometrosDelDia: d.habito.kilometrosDelDia ?? null,
          puntosOtorgados: d.habito.puntosOtorgados,
        }
      : null,
  };
}

export async function enviarCarrera(cuerpo: CuerpoDeLaCarrera): Promise<RespuestaDeLaCarrera> {
  const crudo = await apiFetch<unknown>('/api/v1/carreras', { method: 'POST', body: cuerpo });
  return leerRespuestaDeLaCarrera(crudo, cuerpo.carreraId);
}
