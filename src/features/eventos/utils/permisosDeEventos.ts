/**
 * Quién ve el formulario para crear, editar y cancelar eventos.
 *
 * Decisión del dueño (26/09, §9.3 de la spec): **los crea el Alquimista, y el Admin, que puede
 * todo.** El mentor ya no crea eventos: el backend le responde 403 desde D-186.
 *
 * Esto decide qué se MUESTRA, nunca qué se puede hacer: cada llamada vuelve a autorizar en el
 * servidor. Un rol falseado en el teléfono ve un formulario que termina en 403, no un evento creado.
 */
const ROLES_QUE_GESTIONAN: ReadonlySet<string> = new Set(['ADMIN', 'ALCHEMIST']);

export function puedeGestionarEventos(rol: string | null | undefined): boolean {
  return !!rol && ROLES_QUE_GESTIONAN.has(rol.trim().toUpperCase());
}
