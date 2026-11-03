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

/** El valor de `formation` que pide las tres formaciones juntas (solo lectura): cada hábito trae la suya. */
export const TODAS_LAS_FORMACIONES = 'ALL';

/**
 * El catálogo de UNA formación (activos e inactivos) o, con `TODAS_LAS_FORMACIONES`, el de las tres (spec 023). Con `rol`, los que le
 * aplican, «para todos» incluidos. Sin `formacion` no se manda nada: el servidor responde la Escuela, que es lo que esperaba la app anterior.
 */
export async function leerHabitosDelPrograma(rol?: string | null, formacion?: string | null): Promise<HabitoDelProgramaApi[]> {
  const parametros = [
    ...(rol ? [`role=${encodeURIComponent(rol)}`] : []),
    ...(formacion ? [`formation=${encodeURIComponent(formacion)}`] : []),
  ];
  const ruta = parametros.length > 0 ? `${BASE}?${parametros.join('&')}` : BASE;
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

/**
 * «Copiar a otra formación» (spec 023): el mismo hábito, ya INDEPENDIENTE, en la formación elegida y en una categoría de ESA formación.
 * 201 con el hábito copiado; 400 si la categoría no es de esa formación o está desactivada; 409 si ya hay uno con ese título o con la
 * misma función. El servidor explica el motivo.
 */
export const copiarHabitoDelPrograma = (id: string, destino: { formacion: string; categoria: string }) =>
  pedirHabito('POST', `/${id}/copy`, { formation: destino.formacion, category: destino.categoria });

export const cambiarActivoDelHabito = (id: string, activo: boolean) =>
  pedirHabito('POST', `/${id}/toggle`, { isActive: activo });

/** Con registros, el servidor responde 409 con el motivo («Desactívalo en lugar de eliminarlo»). */
export async function eliminarHabitoDelPrograma(id: string): Promise<void> {
  await apiFetch<unknown>(`${BASE}/${id}`, { method: 'DELETE' });
}
