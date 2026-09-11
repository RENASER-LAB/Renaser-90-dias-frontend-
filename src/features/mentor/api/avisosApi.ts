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

const RUTA_DE_ALUMNO = /^\/mentor\/groups\/([^/]+)\/learners\/([^/]+)$/;

/**
 * Saca grupo y alumno de una ruta de acompañamiento
 * (`/mentor/groups/{grupoId}/learners/{alumnoId}`, `AvisoDeAcompanamientoEvent.rutaApp()`).
 *
 * Está acá y no en cada quien la necesita porque hay DOS caminos hacia la misma pantalla: la
 * bandeja dentro de la app y el toque sobre un push del sistema. Con una copia de la expresión
 * en cada lado, el día que el backend cambie la ruta uno de los dos deja de abrir y nadie se
 * entera — el que falla es justo el que casi nunca se prueba a mano.
 *
 * Se parsea en vez de confiar: un aviso viejo puede apuntar a un grupo que el mentor ya no
 * acompaña. Que la ruta exista no autoriza nada — al abrirla, el servidor revalida y devuelve
 * 403 si corresponde. Acá solo se decide si hay adónde ir.
 *
 * Acepta `unknown` porque desde el push llega el `data` crudo de una notificación, que no pasó
 * por Zod. `decodeURIComponent` puede lanzar con un `%` suelto, y un identificador vacío pasaría
 * la expresión y produciría una URL con `//` que el servidor no sabría interpretar.
 */
export function destinoDeRuta(ruta: unknown): DestinoDeAviso | null {
  if (typeof ruta !== 'string') return null;
  const partes = RUTA_DE_ALUMNO.exec(ruta);
  if (!partes) return null;
  try {
    const grupoId = decodeURIComponent(partes[1]);
    const alumnoId = decodeURIComponent(partes[2]);
    return grupoId && alumnoId ? { grupoId, alumnoId } : null;
  } catch {
    return null;
  }
}

/** El destino de un aviso de la bandeja. */
export function destinoDe(aviso: AvisoApi): DestinoDeAviso | null {
  return destinoDeRuta(aviso.route);
}
