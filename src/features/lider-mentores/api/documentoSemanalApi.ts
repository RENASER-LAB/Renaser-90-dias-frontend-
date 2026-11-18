import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../semaforo/api/semaforoSchemas';

/**
 * El documento semanal (spec 056, contrato `api.md`): el servidor lo genera, lo guarda en el almacenamiento privado y devuelve un
 * enlace que vence a los 10 minutos. Quién puede pedirlo lo decide el servidor (el líder de la formación, Administración y el mentor
 * que acompaña hoy al aprendiz); un 403 llega como `ApiError` con su motivo.
 *
 * - Aprendiz: `POST /leadership/people/{p}/documento` `{ tipo: 'APRENDIZ', semanaHasta? }`.
 * - Mentor: `POST /leadership/mentors/{id}/documento` `{ semanaHasta? }`.
 */
export type TipoDeDocumento = 'APRENDIZ' | 'MENTOR';

/** De quién es el documento que se pide. */
export interface DocumentoQueSeDescarga {
  tipo: TipoDeDocumento;
  personaId: string;
}

export interface DocumentoPedido {
  /** El enlace firmado: vence a los 10 minutos, así que se abre al recibirlo y no se guarda. */
  url: string;
  venceEn: string | null;
  /** `true` si ya existía uno de esa persona y semana con los mismos datos. */
  reutilizado: boolean;
  semana: { desde: string; hasta: string } | null;
}

const respuestaSchema = z
  .object({
    url: z.string().min(1),
    venceEn: z.string().nullish(),
    reutilizado: z.boolean().nullish(),
    semana: z.object({ desde: z.string(), hasta: z.string() }).passthrough().nullish().catch(null),
  })
  .passthrough();

const tramo = encodeURIComponent;

export function rutaDelDocumento({ tipo, personaId }: DocumentoQueSeDescarga): string {
  return tipo === 'MENTOR' ? `/api/v1/leadership/mentors/${tramo(personaId)}/documento` : `/api/v1/leadership/people/${tramo(personaId)}/documento`;
}

/** `semanaHasta` es un viernes; sin él, la semana en curso en la zona de la persona. */
export async function pedirElDocumento(documento: DocumentoQueSeDescarga, semanaHasta?: string | null): Promise<DocumentoPedido> {
  const cuerpo = documento.tipo === 'MENTOR' ? {} : { tipo: 'APRENDIZ' };
  const crudo = await apiFetch<unknown>(rutaDelDocumento(documento), {
    method: 'POST',
    body: semanaHasta ? { ...cuerpo, semanaHasta } : cuerpo,
  });
  const r = validarRespuesta(respuestaSchema, crudo, `POST ${documento.tipo === 'MENTOR' ? '/leadership/mentors/{id}' : '/leadership/people/{p}'}/documento`);
  return { url: r.url, venceEn: r.venceEn ?? null, reutilizado: r.reutilizado === true, semana: r.semana ?? null };
}
