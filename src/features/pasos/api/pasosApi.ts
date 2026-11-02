import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { avisarHabitoCumplido } from '../../habits/eventos/habitoCumplido';
import { validarRespuesta } from '../../habits/api/habitsSchemas';
import { ejecutarEnRegistroVigente } from '../../habits/api/registroVigente';
import type { CuerpoDeLaMedicionAutomatica } from '../utils/lecturaDelDia';

/**
 * `POST /api/v1/habit-tracks/{id}/auto-measurement` (spec 037, D-310): cierra «Kilómetros diarios» con los pasos y la distancia
 * que leyó el teléfono de Health Connect. Va por el mismo camino de seguridad que `/complete`:
 *
 * - antes de enviar se lee el registro de HOY y se compara el ID (`ejecutarEnRegistroVigente`): si pasó la medianoche no se
 *   manda nada, se avisa al resto de la app y se lanza `DiaDeHabitosCambiadoError` (regla del 17-oct);
 * - un 409 «ese día ya cerró» también lo es (el servidor lo impone por D-259);
 * - al confirmar el servidor emite `habitoCumplido`, el aviso del que cuelgan las alarmas, la celebración y los puntos: nadie más
 *   tiene que acordarse de avisar.
 *
 * El servidor es idempotente: reenviar tras perder la respuesta devuelve el registro ya cerrado, sin pagar de nuevo.
 */

const registroCerradoSchema = z
  .object({
    id: z.string(),
    estado: z.string(),
    puntosOtorgados: z.number(),
    completadoEn: z.string().nullish(),
    valorMedido: z.number().nullish(),
  })
  .passthrough();

export type RegistroCerradoPorLosPasos = z.infer<typeof registroCerradoSchema>;

export async function registrarKilometrosAutomaticos(
  registroId: string,
  cuerpo: CuerpoDeLaMedicionAutomatica,
): Promise<RegistroCerradoPorLosPasos> {
  let habitoId: string | undefined;
  let fecha: string | undefined;
  const respuesta = await ejecutarEnRegistroVigente(registroId, track => {
    habitoId = track?.habitoId;
    fecha = track?.fechaEjecucion;
    return apiFetch<unknown>(`/api/v1/habit-tracks/${registroId}/auto-measurement`, { method: 'POST', body: cuerpo });
  });
  const cerrado = validarRespuesta(registroCerradoSchema, respuesta, 'POST /api/v1/habit-tracks/{id}/auto-measurement');
  avisarHabitoCumplido({
    registroId,
    puntosOtorgados: cerrado.puntosOtorgados,
    ...(habitoId ? { habitoId } : {}),
    ...(fecha ? { fecha } : {}),
  });
  return cerrado;
}
