import { apiFetch } from '../../../services/http/apiClient';
import type { EstadoDeLlegada, ListaDeAsistencia, PersonaDeLaLista, RespuestasDelEvento } from '../types/asistencia.types';
import { leerLista, leerPersonaDeLaLista, leerRespuestas } from './asistenciaSchemas';

/**
 * Asistencia a un evento (D-256, backend `calendar`, `AsistenciaController`). Quién puede lo decide el
 * servidor en cada llamada (403 a quien no creó el evento ni es Admin, Alquimista o Líder); un backend
 * sin estos endpoints responde 404 y la app simplemente no muestra la tarjeta.
 */

const BASE = '/api/v1/calendar/events';
const tramo = encodeURIComponent;

export async function verRespuestas(eventoId: string, inicioOcurrencia: string): Promise<RespuestasDelEvento> {
  return leerRespuestas(
    await apiFetch<unknown>(`${BASE}/${tramo(eventoId)}/responses?occurrenceStart=${tramo(inicioOcurrencia)}`),
  );
}

export async function verLista(eventoId: string, inicioOcurrencia: string): Promise<ListaDeAsistencia> {
  return leerLista(
    await apiFetch<unknown>(`${BASE}/${tramo(eventoId)}/attendance?occurrenceStart=${tramo(inicioOcurrencia)}`),
  );
}

/** Idempotente: repetir el mismo estado no cambia nada. `null` = quitar la marca (ausente). */
export async function marcar(
  eventoId: string,
  inicioOcurrencia: string,
  personaId: string,
  llegada: EstadoDeLlegada,
): Promise<PersonaDeLaLista> {
  return leerPersonaDeLaLista(
    await apiFetch<unknown>(`${BASE}/${tramo(eventoId)}/attendance/${tramo(personaId)}`, {
      method: 'PUT',
      body: { occurrenceStart: inicioOcurrencia, estado: llegada },
    }),
  );
}

export async function cerrarLista(eventoId: string, inicioOcurrencia: string): Promise<ListaDeAsistencia> {
  return leerLista(
    await apiFetch<unknown>(`${BASE}/${tramo(eventoId)}/attendance/close`, {
      method: 'POST',
      body: { occurrenceStart: inicioOcurrencia },
    }),
  );
}

export async function reabrirLista(eventoId: string, inicioOcurrencia: string): Promise<ListaDeAsistencia> {
  return leerLista(
    await apiFetch<unknown>(`${BASE}/${tramo(eventoId)}/attendance/reopen`, {
      method: 'POST',
      body: { occurrenceStart: inicioOcurrencia },
    }),
  );
}
