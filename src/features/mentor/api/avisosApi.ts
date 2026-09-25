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

/** La ficha de un alumno: `/mentor/groups/{grupoId}/learners/{alumnoId}` (RF-25). */
export interface DestinoDeAlumno {
  tipo: 'alumno';
  grupoId: string;
  alumnoId: string;
}

/**
 * El semáforo propio: `/semaforo`, la ruta del aviso del sábado «Tu semana ya cerró: mira tu
 * semáforo» (`SemanaDelSemaforoCerradaEvent.rutaApp()`, contrato del semáforo §1.2 y §4.5). No lleva
 * identificadores: es siempre el de quien recibe el aviso.
 */
export interface DestinoDelSemaforo {
  tipo: 'semaforo';
}

/**
 * El semáforo de un grupo, para su mentor: `/mentor/groups/{grupoId}/semaforo`, la ruta del
 * resumen del sábado «Grupo Fénix cerró la semana…» (`ResumenSemanalDelGrupoEvent.rutaApp()`,
 * contrato §1.2 y §4.5). Abre «Mi grupo» en la sección del semáforo.
 */
export interface DestinoDelSemaforoDeGrupo {
  tipo: 'semaforoGrupo';
  grupoId: string;
}

/**
 * El resumen por grupos: `/semaforo/grupos`, la ruta del resumen general del sábado para el líder
 * de mentores, administración y alquimista (`ResumenSemanalGeneralEvent.rutaApp()`, §1.2 y §4.5).
 * No lleva identificadores ni nombres: cada rol abre SU vista.
 */
export interface DestinoDelSemaforoPorGrupos {
  tipo: 'semaforoGrupos';
}

/**
 * Destino de un aviso, extraído de su ruta. `null` si la ruta no tiene una forma que esta versión
 * de la app sepa abrir — entonces el toque solo abre la app, que es lo que el contrato espera de
 * una app instalada ante una ruta nueva (§4.5).
 */
export type DestinoDeAviso =
  | DestinoDeAlumno
  | DestinoDelSemaforo
  | DestinoDelSemaforoDeGrupo
  | DestinoDelSemaforoPorGrupos;

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
/** Exacta: `/semaforo/grupos` es otra pantalla (la del líder y la de administración). */
const RUTA_DEL_SEMAFORO = /^\/semaforo\/?$/;
/** Con la barra final tolerada, igual que `/semaforo`. */
const RUTA_DEL_SEMAFORO_DE_GRUPO = /^\/mentor\/groups\/([^/]+)\/semaforo\/?$/;
const RUTA_DEL_SEMAFORO_POR_GRUPOS = /^\/semaforo\/grupos\/?$/;

/**
 * Saca el destino de la ruta de un aviso: la ficha de un alumno
 * (`/mentor/groups/{grupoId}/learners/{alumnoId}`, `AvisoDeAcompanamientoEvent.rutaApp()`), el
 * semáforo propio (`/semaforo`), el semáforo de un grupo (`/mentor/groups/{grupoId}/semaforo`) o el
 * resumen por grupos (`/semaforo/grupos`).
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
  if (RUTA_DEL_SEMAFORO.test(ruta)) return { tipo: 'semaforo' };
  if (RUTA_DEL_SEMAFORO_POR_GRUPOS.test(ruta)) return { tipo: 'semaforoGrupos' };
  const delGrupo = RUTA_DEL_SEMAFORO_DE_GRUPO.exec(ruta);
  if (delGrupo) {
    const grupoId = decodificar(delGrupo[1]);
    return grupoId ? { tipo: 'semaforoGrupo', grupoId } : null;
  }
  const partes = RUTA_DE_ALUMNO.exec(ruta);
  if (!partes) return null;
  const grupoId = decodificar(partes[1]);
  const alumnoId = decodificar(partes[2]);
  return grupoId && alumnoId ? { tipo: 'alumno', grupoId, alumnoId } : null;
}

/** Un tramo de la ruta, decodificado. `null` si viene vacío o con un `%` suelto (que haría lanzar). */
function decodificar(tramo: string): string | null {
  try {
    return decodeURIComponent(tramo) || null;
  } catch {
    return null;
  }
}

/**
 * El alumno al que lleva un aviso de la bandeja de acompañamiento. Solo alumnos: esa bandeja se
 * filtra por `ACOMPANAMIENTO_ALUMNO` y cada fila abre una ficha; una ruta de otra clase no abre nada.
 */
export function destinoDe(aviso: AvisoApi): DestinoDeAlumno | null {
  const destino = destinoDeRuta(aviso.route);
  return destino?.tipo === 'alumno' ? destino : null;
}
