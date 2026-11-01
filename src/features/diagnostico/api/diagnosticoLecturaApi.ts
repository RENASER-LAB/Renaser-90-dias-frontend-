import { apiFetch } from '../../../services/http/apiClient';
import type { LecturaDelDiagnostico } from '../types/diagnostico.types';
import { leerLecturaDelDiagnostico } from './diagnosticoSchemas';

/**
 * La lectura (solo lectura) del diagnóstico de OTRA persona (spec 026, contrato §4). Misma forma en los tres caminos; cambia la
 * puerta, que es la de cada rol para la ficha de esa persona (y cada una autoriza con sus reglas de hoy):
 *
 * - Administración y Alquimista: `/api/v1/admin/diagnostico/personas/{id}`.
 * - El mentor o la guía: `/api/v1/mentor/groups/{g}/learners/{u}/diagnostico`.
 * - El líder: `/api/v1/leadership/groups/{g}/people/{p}/diagnostico` o, sin grupo, `/api/v1/leadership/people/{p}/diagnostico`.
 *
 * Un 403 (otro rol, cuenta suspendida, ya no la acompaña) o un 404 (backend sin la ruta, otra formación) los lee quien la muestra
 * como «no hay sección». La propia persona lee el suyo con `obtenerLecturaDeMiDiagnostico` (`diagnosticoApi`).
 */

/** Un tramo de la ruta, escapado: un id con `/` o `%` no puede cambiar a qué ruta se llama. */
const tramo = encodeURIComponent;

export function rutaDeLaLecturaParaAdministracion(personaId: string): string {
  return `/api/v1/admin/diagnostico/personas/${tramo(personaId)}`;
}

export function rutaDeLaLecturaParaElMentor(grupoId: string, aprendizId: string): string {
  return `/api/v1/mentor/groups/${tramo(grupoId)}/learners/${tramo(aprendizId)}/diagnostico`;
}

/** Con `grupoId` en `null`, la puerta sin grupo del líder (la de «Todos los aprendices»). */
export function rutaDeLaLecturaParaElLider(grupoId: string | null, personaId: string): string {
  return grupoId === null
    ? `/api/v1/leadership/people/${tramo(personaId)}/diagnostico`
    : `/api/v1/leadership/groups/${tramo(grupoId)}/people/${tramo(personaId)}/diagnostico`;
}

async function leer(ruta: string): Promise<LecturaDelDiagnostico> {
  return leerLecturaDelDiagnostico(await apiFetch<unknown>(ruta, { timeoutMs: 15_000 }));
}

export function lecturaParaAdministracion(personaId: string): Promise<LecturaDelDiagnostico> {
  return leer(rutaDeLaLecturaParaAdministracion(personaId));
}

export function lecturaParaElMentor(grupoId: string, aprendizId: string): Promise<LecturaDelDiagnostico> {
  return leer(rutaDeLaLecturaParaElMentor(grupoId, aprendizId));
}

export function lecturaParaElLider(grupoId: string | null, personaId: string): Promise<LecturaDelDiagnostico> {
  return leer(rutaDeLaLecturaParaElLider(grupoId, personaId));
}
