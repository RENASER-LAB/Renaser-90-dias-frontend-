import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../tickets/api/ticketsSchemas';
import {
  fichaSchema,
  observacionSchema,
  padronSchema,
  reporteSchema,
  type FichaApi,
  type ObservacionApi,
  type PadronApi,
  type ReporteApi,
  type TipoObservacion,
} from './liderMentoresSchemas';

/**
 * La gestión del Líder de Mentores (backend D-241). Quién puede: MENTOR_LEAD, ADMIN y ALQUIMISTA con
 * la cuenta activa; lo decide el servidor (`AccesoDeLiderazgo`), no la app.
 */
const BASE = '/api/v1/leadership';

export async function obtenerPadron(): Promise<PadronApi> {
  return validarRespuesta<PadronApi>(padronSchema, await apiFetch<unknown>(`${BASE}/mentors`), 'GET /leadership/mentors');
}

export async function obtenerFicha(mentorId: string): Promise<FichaApi> {
  return validarRespuesta<FichaApi>(
    fichaSchema,
    await apiFetch<unknown>(`${BASE}/mentors/${encodeURIComponent(mentorId)}`),
    'GET /leadership/mentors/{id}',
  );
}

/** `mes` en `AAAA-MM`; sin él, el mes en curso. */
export async function obtenerReporte(mes?: string | null): Promise<ReporteApi> {
  const query = mes ? `?month=${encodeURIComponent(mes)}` : '';
  return validarRespuesta<ReporteApi>(reporteSchema, await apiFetch<unknown>(`${BASE}/report${query}`), 'GET /leadership/report');
}

export interface NuevaObservacion {
  tipo: TipoObservacion;
  texto: string;
  /** La misma en un reintento: el servidor no crea dos. */
  claveOperacion: string;
  /** El mensaje del chat en el que ya se mandó; null si no se mandó o si falló. */
  mensajeId: string | null;
}

export async function registrarObservacion(mentorId: string, nueva: NuevaObservacion): Promise<ObservacionApi> {
  return validarRespuesta<ObservacionApi>(
    observacionSchema,
    await apiFetch<unknown>(`${BASE}/mentors/${encodeURIComponent(mentorId)}/observations`, {
      method: 'POST',
      body: {
        type: nueva.tipo,
        text: nueva.texto,
        sentByChat: nueva.mensajeId !== null,
        messageId: nueva.mensajeId,
        operationKey: nueva.claveOperacion,
      },
    }),
    'POST /leadership/mentors/{id}/observations',
  );
}
