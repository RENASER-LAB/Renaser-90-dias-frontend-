import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import {
  catalogoDelProgramaSchema,
  habitoDelProgramaSchema,
  rolesElegiblesSchema,
  type CuerpoHabitoDelPrograma,
  type HabitoDelProgramaApi,
  type RolElegibleApi,
} from './habitosProgramaSchemas';

/**
 * «Hábitos del programa» (spec 001 del backend, D-264): el CRUD del catálogo global que ya existía en
 * el servidor, más la audiencia por rol. Solo ADMIN y ALCHEMIST activos; cualquier otro recibe 403 del
 * servidor, que es quien autoriza.
 */
export const BASE_DE_HABITOS_DEL_PROGRAMA = '/api/v1/admin/habits';
const BASE = BASE_DE_HABITOS_DEL_PROGRAMA;

async function pedirHabito(metodo: 'POST', ruta: string, body: unknown): Promise<HabitoDelProgramaApi> {
  return validarRespuesta<HabitoDelProgramaApi>(
    habitoDelProgramaSchema,
    await apiFetch<unknown>(`${BASE}${ruta}`, { method: metodo, body }),
    `${metodo} ${BASE}${ruta}`,
  );
}

/** Todo el catálogo (activos e inactivos). Con `rol`, los que le aplican, «para todos» incluidos. */
export async function leerHabitosDelPrograma(rol?: string | null): Promise<HabitoDelProgramaApi[]> {
  const ruta = rol ? `${BASE}?role=${encodeURIComponent(rol)}` : BASE;
  return validarRespuesta<HabitoDelProgramaApi[]>(catalogoDelProgramaSchema, await apiFetch<unknown>(ruta), `GET ${ruta}`);
}

/** Los roles elegibles con el nombre que les pone el servidor: un rol nuevo aparece sin otra versión de la app. */
export async function leerRolesElegibles(): Promise<RolElegibleApi[]> {
  const ruta = `${BASE}/roles`;
  return validarRespuesta<RolElegibleApi[]>(rolesElegiblesSchema, await apiFetch<unknown>(ruta), `GET ${ruta}`);
}

export const crearHabitoDelPrograma = (cuerpo: CuerpoHabitoDelPrograma) => pedirHabito('POST', '', cuerpo);

export const editarHabitoDelPrograma = (id: string, cuerpo: CuerpoHabitoDelPrograma) =>
  pedirHabito('POST', `/${id}`, cuerpo);

export const cambiarActivoDelHabito = (id: string, activo: boolean) =>
  pedirHabito('POST', `/${id}/toggle`, { isActive: activo });

/** Con registros, el servidor responde 409 con el motivo («Desactívalo en lugar de eliminarlo»). */
export async function eliminarHabitoDelPrograma(id: string): Promise<void> {
  await apiFetch<unknown>(`${BASE}/${id}`, { method: 'DELETE' });
}
