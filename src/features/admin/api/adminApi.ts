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
  paginaStaffSchema,
  type AprendizCandidatoApi,
  type CohorteAdminApi,
  type GrupoDetalleApi,
  type GrupoResumenApi,
  type MentorCandidatoApi,
  type PaginaAprendicesApi,
  type PaginaSolicitudesApi,
  type PaginaStaffApi,
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

/**
 * `POST /api/v1/admin/cohorts`. Crea la generación a la que pertenecen los grupos.
 *
 * `startDate` es obligatoria en el backend; si no se pasa una, va la de hoy. `endDate` es
 * opcional —una cohorte puede no tener fin— y se omite.
 */
export async function crearCohorte(nombre: string, fechaInicio?: string): Promise<CohorteAdminApi> {
  const startDate = fechaInicio ?? new Date().toISOString().slice(0, 10);
  return validarRespuesta<CohorteAdminApi>(
    cohorteAdminSchema,
    await apiFetch<unknown>('/api/v1/admin/cohorts', {
      method: 'POST',
      body: { name: nombre, startDate },
    }),
    'POST /api/v1/admin/cohorts',
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
 * Los cuatro roles que `/admin/staff` sabe filtrar. `TRAINEE` queda afuera **en el tipo** y no en
 * un comentario porque el backend lo rechaza: `ListStaffCommand` valida contra `ROLES_STAFF` y
 * lanza `IllegalArgumentException` («roleFilter debe ser un rol de staff»). Los aprendices tienen
 * su propio listado, `/admin/trainees`.
 */
export type RolDeStaff = Exclude<RolAsignable, 'TRAINEE'>;

/**
 * `GET /api/v1/admin/staff?role=&status=&page=&size=`.
 *
 * **El único listado del panel que trae el rol de verdad.** Devuelve los cuatro roles de staff
 * —MENTOR, MENTOR_LEAD, ADMIN, ALCHEMIST— con el campo `role` que sale de la base; sin filtro de
 * rol los devuelve todos, y sin filtro de estado incluye también a las cuentas suspendidas
 * (`StaffAdminService.listar`: `statusFilter` nulo no se aplica).
 *
 * `specs/003/PENDIENTES.md` §4 afirma que para ver estos roles «haría falta un endpoint nuevo».
 * No hace falta: existe desde el gap #6 y está sin consumir.
 *
 * El guard real vive dentro del servicio (`RequireAdminGuard`): solo ADMIN y ALQUIMISTA, los
 * mismos dos que pueden cambiar roles. Quien no lo sea recibe 403 aunque llegue a la pantalla.
 */
export async function listarStaff(opciones: {
  rol?: RolDeStaff;
  estado?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  pagina?: number;
  tamano?: number;
}): Promise<PaginaStaffApi> {
  const params = new URLSearchParams({
    page: String(opciones.pagina ?? 0),
    size: String(opciones.tamano ?? 20),
  });
  if (opciones.rol) params.set('role', opciones.rol);
  if (opciones.estado) params.set('status', opciones.estado);

  return validarRespuesta<PaginaStaffApi>(
    paginaStaffSchema,
    await apiFetch<unknown>(`/api/v1/admin/staff?${params.toString()}`),
    'GET /api/v1/admin/staff',
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

/** Los cinco roles que el backend acepta en `PATCH /users/{id}/role`. `ASSISTANT` existe en el
 * enum de la base pero el contrato de la API lo rechaza con 400: no se ofrece. */
export type RolAsignable = 'TRAINEE' | 'MENTOR' | 'MENTOR_LEAD' | 'ADMIN' | 'ALCHEMIST';

/**
 * `PATCH /api/v1/users/{id}/role`.
 *
 * El guard real es `User.requireRoleManager` dentro del caso de uso: solo ADMIN y ALQUIMISTA.
 * Al promover a MENTOR el backend crea el perfil de mentor si falta, asi que no hace falta un
 * segundo paso desde aca.
 */
export async function cambiarRolDeUsuario(usuarioId: string, nuevoRol: RolAsignable): Promise<void> {
  await apiFetch<unknown>(`/api/v1/users/${encodeURIComponent(usuarioId)}/role`, {
    method: 'PATCH',
    // `apiFetch` ya hace `JSON.stringify(body)`: acá va el objeto crudo, como el resto de este
    // archivo. Pasar un string lo codificaba dos veces y el backend respondía 400 «cuerpo
    // malformado». E18 no lo vio porque probó la API directa, no esta función.
    body: { newRole: nuevoRol },
  });
}

export async function rechazarSolicitud(id: string, motivo: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/account-requests/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: { reason: motivo },
  });
}
