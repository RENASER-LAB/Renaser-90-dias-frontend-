import { apiFetch } from '../../../services/http/apiClient';

/**
 * Lo que el líder hace sobre sus mentores y sus aprendices (spec 056, contrato `api.md`). El servidor manda el mensaje al chat y el aviso al
 * teléfono: la app no reenvía nada por el chat. Las dos llevan `operationKey`, que no cambia en un reintento: el mismo pedido no se
 * duplica. Quién puede lo decide el servidor; un rechazo llega como `ApiError` con su motivo (`SIN_MENTOR`, `FUERA_DE_SU_ALCANCE`…).
 */
const BASE = '/api/v1/leadership';
const tramo = encodeURIComponent;

/** `POST /leadership/people/{p}/avisar-al-mentor` `{ texto, operationKey }` → 204. Sin mentor, 409 `SIN_MENTOR`. */
export async function avisarAlMentor(personaId: string, texto: string, claveOperacion: string): Promise<void> {
  await apiFetch<unknown>(`${BASE}/people/${tramo(personaId)}/avisar-al-mentor`, {
    method: 'POST',
    body: { texto: texto.trim(), operationKey: claveOperacion },
  });
}

/** `POST /leadership/tickets/{id}/recordar` `{ operationKey }` → 204: el mentor asignado recibe la consulta en su chat con el líder. */
export async function recordarConsulta(ticketId: string, claveOperacion: string): Promise<void> {
  await apiFetch<unknown>(`${BASE}/tickets/${tramo(ticketId)}/recordar`, { method: 'POST', body: { operationKey: claveOperacion } });
}
