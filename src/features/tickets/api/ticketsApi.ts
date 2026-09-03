import { apiFetch } from '../../../services/http/apiClient';
import type { AbrirTicketMentorPayload, WireTicketMentor, WireTicketsMentorPage } from '../types/tickets.types';
import {
  validarRespuesta,
  wireTicketMentorSchema,
  wireTicketsMentorPageSchema,
} from './ticketsSchemas';

export async function obtenerTicketsMentor(cursor?: string): Promise<WireTicketsMentorPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const r = await apiFetch<unknown>(`/api/v1/tickets${query}`);
  return validarRespuesta<WireTicketsMentorPage>(wireTicketsMentorPageSchema, r, 'GET /api/v1/tickets');
}

export async function abrirTicketMentor(payload: AbrirTicketMentorPayload): Promise<WireTicketMentor> {
  const r = await apiFetch<unknown>('/api/v1/tickets', {
    method: 'POST',
    body: payload,
  });
  return validarRespuesta<WireTicketMentor>(wireTicketMentorSchema, r, 'POST /api/v1/tickets');
}
