/**
 * Quién ve el formulario para crear, editar y cancelar eventos.
 *
 * Decisión del dueño (26/09, §9.3 de la spec): **los crea el Alquimista, y el Admin, que puede
 * todo.** Esto dice quién ADMINISTRA todo el calendario.
 *
 * Corregido 2026-11-06 (spec 044): el líder, el mentor y la guía vuelven a crear eventos, cada uno para su gente. Quién más crea no lo decide esta
 * lista sino el servidor (`GET /calendar/audience/options`, `useOpcionesDeAudiencia`).
 *
 * Esto decide qué se MUESTRA, nunca qué se puede hacer: cada llamada vuelve a autorizar en el
 * servidor. Un rol falseado en el teléfono ve un formulario que termina en 403, no un evento creado.
 */
const ROLES_QUE_GESTIONAN: ReadonlySet<string> = new Set(['ADMIN', 'ALCHEMIST']);

export function puedeGestionarEventos(rol: string | null | undefined): boolean {
  return !!rol && ROLES_QUE_GESTIONAN.has(rol.trim().toUpperCase());
}

/** Spec 044: Administración, Alquimista y Soporte TI ven todas las formaciones y eligen en cuál nace el evento. */
const ROLES_QUE_VEN_TODAS: ReadonlySet<string> = new Set(['ADMIN', 'ALCHEMIST', 'IT_SUPPORT']);

export function rolVeTodas(rol: string | null | undefined): boolean {
  return !!rol && ROLES_QUE_VEN_TODAS.has(rol.trim().toUpperCase());
}
