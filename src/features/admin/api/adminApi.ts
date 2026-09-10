import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import { semanaAlumnoSchema, type SemanaAlumnoApi } from '../../mentor/api/mentorSchemas';
import {
  aprendizCandidatoSchema,
  cohorteAdminSchema,
  grupoDetalleSchema,
  grupoResumenSchema,
  mentorCandidatoSchema,
  paginaAprendicesSchema,
  paginaSolicitudesSchema,
  type AprendizCandidatoApi,
  type CohorteAdminApi,
  type GrupoDetalleApi,
  type GrupoResumenApi,
  type MentorCandidatoApi,
  type PaginaAprendicesApi,
  type PaginaSolicitudesApi,
} from './adminSchemas';
import { z } from 'zod';

/**
 * Superficie administrativa. Todas las rutas ya existían en el backend salvo la semana
 * administrativa; ninguna se inventa acá.
 *
 * Regla de la casa: los filtros y la búsqueda viajan al servidor. Filtrar sobre la página ya
 * descargada esconde lo que está en la página cuatro y hace creer que no existe.
 */

// ── Cohortes y grupos ─────────────────────────────────────────────────────

export async function listarCohortes(): Promise<CohorteAdminApi[]> {
  return validarRespuesta<CohorteAdminApi[]>(
    z.array(cohorteAdminSchema),
    await apiFetch<unknown>('/api/v1/admin/cohorts'),
    'GET /api/v1/admin/cohorts',
  );
}

/** `GET /api/v1/admin/cells?cohortId=…`. El backend EXIGE la cohorte: no hay listado suelto. */
export async function listarGruposDeCohorte(cohorteId: string): Promise<GrupoResumenApi[]> {
  return validarRespuesta<GrupoResumenApi[]>(
    z.array(grupoResumenSchema),
    await apiFetch<unknown>(`/api/v1/admin/cells?cohortId=${encodeURIComponent(cohorteId)}`),
    'GET /api/v1/admin/cells',
  );
}

export async function obtenerGrupo(grupoId: string): Promise<GrupoDetalleApi> {
  return validarRespuesta<GrupoDetalleApi>(
    grupoDetalleSchema,
    await apiFetch<unknown>(`/api/v1/admin/cells/${encodeURIComponent(grupoId)}`),
    'GET /api/v1/admin/cells/{id}',
  );
}

export type DatosDeGrupo = {
  nombre: string;
  cohorteId: string;
  urlVideollamada?: string | null;
  /** Las dos o ninguna: media fecha no es medio período, es un error. */
  periodoInicio?: string | null;
  periodoFin?: string | null;
  tipo?: 'REGULAR' | 'RECEPTION';
  capacidad?: number | null;
};

export async function crearGrupo(datos: DatosDeGrupo): Promise<GrupoDetalleApi> {
  return validarRespuesta<GrupoDetalleApi>(
    grupoDetalleSchema,
    await apiFetch<unknown>('/api/v1/admin/cells', {
      method: 'POST',
      body: {
        name: datos.nombre,
        cohortId: datos.cohorteId,
        videoCallUrl: datos.urlVideollamada ?? null,
        periodStart: datos.periodoInicio ?? null,
        periodEnd: datos.periodoFin ?? null,
        type: datos.tipo ?? 'REGULAR',
        capacity: datos.capacidad ?? null,
      },
    }),
    'POST /api/v1/admin/cells',
  );
}

/**
 * `PATCH /api/v1/admin/cells/{id}`.
 *
 * El período tiene una semántica que la UI NO puede tratar a la ligera: si no se mandan fechas ni
 * `clearPeriod`, el grupo conserva las suyas. Y un body con las dos cosas se contradice — el
 * servidor le da prioridad al borrado. Por eso acá son excluyentes: o se piden fechas, o se pide
 * borrar, nunca ambas.
 */
export async function actualizarGrupo(
  grupoId: string,
  cambios: {
    nombre?: string;
    urlVideollamada?: string | null;
    periodoInicio?: string | null;
    periodoFin?: string | null;
    borrarPeriodo?: boolean;
    capacidad?: number | null;
    devolverCapacidadALaPolitica?: boolean;
  },
): Promise<GrupoDetalleApi> {
  const borra = cambios.borrarPeriodo === true;
  return validarRespuesta<GrupoDetalleApi>(
    grupoDetalleSchema,
    await apiFetch<unknown>(`/api/v1/admin/cells/${encodeURIComponent(grupoId)}`, {
      method: 'PATCH',
      body: {
        name: cambios.nombre,
        videoCallUrl: cambios.urlVideollamada,
        periodStart: borra ? undefined : cambios.periodoInicio,
        periodEnd: borra ? undefined : cambios.periodoFin,
        clearPeriod: borra ? true : undefined,
        capacity: cambios.devolverCapacidadALaPolitica ? undefined : cambios.capacidad,
        resetCapacity: cambios.devolverCapacidadALaPolitica ? true : undefined,
      },
    }),
    'PATCH /api/v1/admin/cells/{id}',
  );
}

// ── Composición ───────────────────────────────────────────────────────────

export async function mentoresDisponibles(): Promise<MentorCandidatoApi[]> {
  return validarRespuesta<MentorCandidatoApi[]>(
    z.array(mentorCandidatoSchema),
    await apiFetch<unknown>('/api/v1/admin/cells/mentores'),
    'GET /api/v1/admin/cells/mentores',
  );
}

export async function aprendicesDisponibles(): Promise<AprendizCandidatoApi[]> {
  return validarRespuesta<AprendizCandidatoApi[]>(
    z.array(aprendizCandidatoSchema),
    await apiFetch<unknown>('/api/v1/admin/cells/aprendices-disponibles'),
    'GET /api/v1/admin/cells/aprendices-disponibles',
  );
}

export async function asignarMentor(grupoId: string, mentorId: string): Promise<GrupoDetalleApi> {
  return validarRespuesta<GrupoDetalleApi>(
    grupoDetalleSchema,
    await apiFetch<unknown>(`/api/v1/admin/cells/${encodeURIComponent(grupoId)}/mentor`, {
      method: 'PUT',
      body: { leaderUserId: mentorId },
    }),
    'PUT /api/v1/admin/cells/{id}/mentor',
  );
}

export async function quitarMentor(grupoId: string): Promise<GrupoDetalleApi> {
  return validarRespuesta<GrupoDetalleApi>(
    grupoDetalleSchema,
    await apiFetch<unknown>(`/api/v1/admin/cells/${encodeURIComponent(grupoId)}/mentor`, {
      method: 'DELETE',
    }),
    'DELETE /api/v1/admin/cells/{id}/mentor',
  );
}

export async function agregarAprendiz(grupoId: string, aprendizId: string): Promise<GrupoDetalleApi> {
  return validarRespuesta<GrupoDetalleApi>(
    grupoDetalleSchema,
    await apiFetch<unknown>(`/api/v1/admin/cells/${encodeURIComponent(grupoId)}/trainees`, {
      method: 'POST',
      body: { traineeId: aprendizId },
    }),
    'POST /api/v1/admin/cells/{id}/trainees',
  );
}

/** El id del grupo NO es decorativo: el servidor comprueba que el aprendiz sea de ESE grupo. */
export async function retirarAprendiz(grupoId: string, aprendizId: string): Promise<void> {
  await apiFetch<unknown>(
    `/api/v1/admin/cells/${encodeURIComponent(grupoId)}/trainees/${encodeURIComponent(aprendizId)}`,
    { method: 'DELETE' },
  );
}

// ── Personas ──────────────────────────────────────────────────────────────

export async function listarAprendices(opciones: {
  pagina?: number;
  tamano?: number;
  busqueda?: string | null;
  soloSinGrupo?: boolean;
}): Promise<PaginaAprendicesApi> {
  const params = new URLSearchParams({
    page: String(opciones.pagina ?? 0),
    size: String(opciones.tamano ?? 20),
  });
  if (opciones.busqueda && opciones.busqueda.trim()) params.set('q', opciones.busqueda.trim());
  if (opciones.soloSinGrupo) params.set('withoutGroup', 'true');

  return validarRespuesta<PaginaAprendicesApi>(
    paginaAprendicesSchema,
    await apiFetch<unknown>(`/api/v1/admin/trainees?${params.toString()}`),
    'GET /api/v1/admin/trainees',
  );
}

/**
 * `GET /api/v1/admin/trainees/{id}/weekly-progress`.
 *
 * Devuelve exactamente lo mismo que la semana del mentor —mismas obligaciones históricas, mismo
 * motor— pero por otra puerta y con otra autorización. Por eso reutiliza su esquema: si el
 * administrador y el mentor vieran formas distintas del mismo día, alguna estaría mal.
 */
export async function obtenerSemanaAdministrativa(
  aprendizId: string,
  inicio?: string,
): Promise<SemanaAlumnoApi> {
  const ruta =
    `/api/v1/admin/trainees/${encodeURIComponent(aprendizId)}/weekly-progress` +
    (inicio ? `?weekStart=${encodeURIComponent(inicio)}` : '');
  return validarRespuesta<SemanaAlumnoApi>(
    semanaAlumnoSchema,
    await apiFetch<unknown>(ruta),
    'GET /api/v1/admin/trainees/{id}/weekly-progress',
  );
}

// ── Solicitudes ───────────────────────────────────────────────────────────

/** `estado` es el enum del backend, en inglés: PENDING | APPROVED | REJECTED. */
export async function listarSolicitudes(
  estado: 'PENDING' | 'APPROVED' | 'REJECTED',
  pagina = 0,
): Promise<PaginaSolicitudesApi> {
  const params = new URLSearchParams({ status: estado, page: String(pagina), size: '20' });
  return validarRespuesta<PaginaSolicitudesApi>(
    paginaSolicitudesSchema,
    await apiFetch<unknown>(`/api/v1/account-requests?${params.toString()}`),
    'GET /api/v1/account-requests',
  );
}

export async function aprobarSolicitud(id: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/account-requests/${encodeURIComponent(id)}/approve`, { method: 'POST' });
}

export async function rechazarSolicitud(id: string, motivo: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/account-requests/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: { reason: motivo },
  });
}
