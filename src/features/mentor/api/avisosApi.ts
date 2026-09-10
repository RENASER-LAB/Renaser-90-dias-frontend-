import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from './mentorSchemas';

/**
 * Los avisos de acompañamiento del mentor salen de la bandeja que YA existe
 * (`GET /api/v1/notifications`), filtrados por tipo.
 *
 * No hay endpoint propio ni tabla de alertas aparte: el SDD lo prohíbe explícitamente y con
 * razón — la bandeja ya resuelve preferencias, marcado de leído, deduplicación por origen y
 * purga a los 90 días. Duplicar eso para una feature es como se terminan teniendo dos
 * bandejas que no coinciden.
 */
const TIPO_ACOMPANAMIENTO = 'ACOMPANAMIENTO_ALUMNO';

const bandejaSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.number(),
          type: z.string(),
          title: z.string(),
          body: z.string(),
          createdAt: z.string(),
          readAt: z.string().nullable(),
          /** `/mentor/groups/{grupo}/learners/{alumno}` cuando es un aviso de acompañamiento. */
          route: z.string().nullable(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export type AvisoApi = z.infer<typeof bandejaSchema>['items'][number];

/** Destino de un aviso, extraído de su ruta. `null` si la ruta no tiene la forma esperada. */
export interface DestinoDeAviso {
  grupoId: string;
  alumnoId: string;
}

export async function obtenerAvisosDeAcompanamiento(): Promise<AvisoApi[]> {
  const bandeja = validarRespuesta<z.infer<typeof bandejaSchema>>(
    bandejaSchema,
    await apiFetch<unknown>('/api/v1/notifications'),
    'GET /api/v1/notifications',
  );
  return bandeja.items.filter(n => n.type === TIPO_ACOMPANAMIENTO);
}

export async function marcarAvisoLeido(id: number): Promise<void> {
  await apiFetch<unknown>(`/api/v1/notifications/${id}/read`, { method: 'PUT' });
}

/**
 * Saca grupo y alumno de la ruta del aviso.
 *
 * Se parsea en vez de confiar: un aviso viejo puede apuntar a un grupo que el mentor ya no
 * acompaña. Que la ruta exista no autoriza nada — al abrirla, el servidor revalida y devuelve
 * 403 si corresponde. Acá solo se decide si hay adónde ir.
 */
export function destinoDe(aviso: AvisoApi): DestinoDeAviso | null {
  const partes = aviso.route?.match(/^\/mentor\/groups\/([^/]+)\/learners\/([^/]+)$/);
  return partes ? { grupoId: partes[1], alumnoId: partes[2] } : null;
}
