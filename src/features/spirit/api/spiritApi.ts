import { apiFetch } from '../../../services/http/apiClient';
import type { SpiritStatusApi, SubmitSpiritSummaryApi } from '../types/spirit.types';
import { spiritSchemas, validarRespuesta } from './spiritSchemas';

/**
 * Endpoints de `EspirituController` (backend Java) — el hábito "Pastilla Renacer".
 *
 * ## Por qué este hábito NO se cierra con `POST /habit-tracks/{id}/complete`
 *
 * "Pastilla Renacer" tiene estado propio en el servidor (`registros_espiritu`): qué audio te toca,
 * cuándo se desbloqueó, hasta qué hora podés entregar, y si el día quedó entregado, pendiente o
 * perdido. Ese estado no vive en el track del día. Por eso la entrega va por `POST
 * /api/v1/spirit-audio/submit`, y es el propio backend el que, con esa misma entrega, completa
 * además el hábito del día (`EspirituService.reflejarEnPastillaRenacer`) — mismo patrón que la
 * Clase Diaria en `academy/api/claseDiariaApi.ts`.
 *
 * O sea: el móvil hace UNA llamada. Después recarga Training y el hábito ya viene `COMPLETADO`.
 */

/**
 * GET /api/v1/spirit-audio/status — el estado día por día de Espíritu.
 *
 * Sin parámetros a propósito: el día de programa lo resuelve el servidor. Además, esta lectura
 * **avanza el estado** (desbloquea el audio del día si corresponde, marca como perdido el que
 * venció): es la llamada que hace que la Pastilla del día exista. Por eso conviene pedirla al
 * abrir Training y no recién al tocar el hábito.
 *
 * Efecto colateral buscado en el rendimiento: la respuesta ya trae la `audioUrl` firmada, así que
 * cuando la persona abre el modal el reproductor arranca a bajar en el acto — sin una llamada de
 * red intermedia. Eso saca la latencia de la API del presupuesto de "que suene en menos de 3s".
 */
export async function obtenerEstadoEspiritu(): Promise<SpiritStatusApi> {
  const r = await apiFetch<unknown>('/api/v1/spirit-audio/status');
  return validarRespuesta(spiritSchemas.status, r, 'GET /api/v1/spirit-audio/status');
}

/**
 * POST /api/v1/spirit-audio/submit — entrega lo que la persona escuchó e interpretó.
 *
 * `day` es el día de AUDIO (el `currentDay` del status), no el día de programa.
 *
 * Entregar después del mediodía **no falla**: el backend guarda el texto igual y responde
 * `onTime: false`. No hay que tratarlo como error ni descartar lo escrito.
 *
 * NO es idempotente: un segundo envío del mismo día responde 409 (el registro ya no está
 * pendiente). Por eso la pantalla cierra el modal solo cuando este POST respondió OK.
 */
export async function entregarResumenEspiritu(
  day: number,
  summaryText: string,
): Promise<SubmitSpiritSummaryApi> {
  const r = await apiFetch<unknown>('/api/v1/spirit-audio/submit', {
    method: 'POST',
    body: { day, summaryText },
  });
  return validarRespuesta(spiritSchemas.submit, r, 'POST /api/v1/spirit-audio/submit');
}

/**
 * Identidad funcional del hábito en el catálogo (`habitos.clave_sistema`). Es lo que deja
 * reconocerlo en Training sin emparejar por título — el título es editable desde el panel admin y
 * emparejar por texto haría desaparecer la función en silencio.
 */
export const CLAVE_SISTEMA_PASTILLA_RENACER = 'PASTILLA_RENACER';

/**
 * Largo mínimo de la respuesta. **No lo impone el backend** (`/spirit-audio/submit` solo exige que
 * no venga vacío): es una guarda de esta pantalla para que "escuchá y contame qué interpretaste"
 * no se resuelva con una letra. Se eligió el mismo número que ya usa la Clase Diaria para que las
 * dos experiencias de Training pidan lo mismo.
 */
export const RESPUESTA_MIN_LENGTH = 15;
/** Tope de seguridad del lado del cliente; el campo del backend es `text`, sin límite propio. */
export const RESPUESTA_MAX_LENGTH = 2000;
