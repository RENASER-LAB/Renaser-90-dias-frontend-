import { apiFetch } from '../../../services/http/apiClient';
import type { AbrirTicketMentorPayload, WireTicketMentor, WireTicketsMentorPage } from '../types/tickets.types';
import {
  validarRespuesta,
  wireTicketMentorSchema,
  wireTicketsMentorPageSchema,
} from './ticketsSchemas';

/** `GET /api/v1/tickets` — los tickets PROPIOS de quien llama. */
export async function obtenerTicketsMentor(cursor?: string): Promise<WireTicketsMentorPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const r = await apiFetch<unknown>(`/api/v1/tickets${query}`);
  return validarRespuesta<WireTicketsMentorPage>(wireTicketsMentorPageSchema, r, 'GET /api/v1/tickets');
}

/**
 * `GET /api/v1/admin/tickets` — **todos** los tickets de mentoría de la plataforma.
 *
 * Otra ruta y otra autorización, pero exactamente la misma forma de respuesta
 * (`TicketsMentorPageResponse`), así que reusa el esquema de arriba: si las dos puertas
 * devolvieran formas distintas del mismo ticket, alguna estaría mal.
 *
 * Quién puede: MENTOR_LEAD, ADMIN y ALQUIMISTA. El guard real está en el servicio
 * (`TicketMentorService`: «Solo MENTOR_LEAD/ADMIN/ALCHEMIST ven todos los tickets»), no en el
 * interceptor de permisos — que para este rol todavía corre en modo sombra y registra sin
 * denegar. Es de **solo lectura**: no hay responder desde acá.
 *
 * `cursor` viaja en ISO-8601, que es lo que devuelve `nextCursor`; el servidor rechaza con 400
 * cualquier otro formato.
 */
export async function obtenerBandejaDeTickets(cursor?: string | null): Promise<WireTicketsMentorPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const r = await apiFetch<unknown>(`/api/v1/admin/tickets${query}`);
  return validarRespuesta<WireTicketsMentorPage>(
    wireTicketsMentorPageSchema,
    r,
    'GET /api/v1/admin/tickets',
  );
}

export async function abrirTicketMentor(payload: AbrirTicketMentorPayload): Promise<WireTicketMentor> {
  const r = await apiFetch<unknown>('/api/v1/tickets', {
    method: 'POST',
    body: payload,
  });
  return validarRespuesta<WireTicketMentor>(wireTicketMentorSchema, r, 'POST /api/v1/tickets');
}

/**
 * `POST /api/v1/tickets/{id}/answer` `{ mentorAnswer }`: responde la consulta. Desde la spec 056 también la responde el líder de la formación del aprendiz
 * (`respondidoPor` dice quién): el aprendiz recibe la respuesta con su nombre y el mentor la ve en su bandeja.
 */
export async function responderTicketMentor(ticketId: string, respuesta: string): Promise<WireTicketMentor> {
  const r = await apiFetch<unknown>(`/api/v1/tickets/${encodeURIComponent(ticketId)}/answer`, {
    method: 'POST',
    body: { mentorAnswer: respuesta.trim() },
  });
  return validarRespuesta<WireTicketMentor>(wireTicketMentorSchema, r, 'POST /api/v1/tickets/{id}/answer');
}
