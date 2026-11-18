/** «hoy», «hace 1 día», «hace 5 días»: cuánto lleva abierta una consulta, en días completos (spec 056 FR-028). Una fecha que no se lee no inventa un número. */
export function haceCuantosDias(creadaEn: string, ahora: number = Date.now()): string | null {
  const ms = new Date(creadaEn).getTime();
  if (Number.isNaN(ms)) return null;
  const dias = Math.max(0, Math.floor((ahora - ms) / 86_400_000));
  return dias === 0 ? 'hoy' : `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** Quién pregunta y a qué mentor le toca: «Ana López → su mentor E2E Mentor». Lo que no se sabe no se inventa: «Un aprendiz → su mentor». */
export function quienPregunta(aprendiz: string | null, mentor: string | null): string {
  return `${aprendiz?.trim() || 'Un aprendiz'} → ${mentor?.trim() ? `su mentor ${mentor.trim()}` : 'su mentor'}`;
}

/** El mentor a cuyos aprendices se filtran las consultas (spec 056 FR-028): su nombre y los grupos que tiene, para reconocer a quienes acompaña. */
export interface MentorDeLasConsultas {
  id: string;
  nombre: string;
  /** Los grupos que el servidor dice que acompaña hoy; vacío si no se pudieron leer. */
  grupoIds: readonly string[];
}

const igualSinMayusculas = (a: string, b: string) => a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es');

/**
 * ¿Quien pregunta es aprendiz de ese mentor? La consulta trae solo el id de la persona y «Todos los aprendices» dice su grupo y el nombre de su mentor, no el id del mentor
 * (`GET /leadership/people`): así que se reconoce por el grupo —que sí es un id— y, solo si no se sabe qué grupos tiene el mentor, por su nombre. Alguien a quien no se
 * pudo ubicar (`null`) no es de nadie: la pantalla lo cuenta aparte, no lo esconde.
 */
export function esDeLosAprendicesDe(quien: { grupoId?: string | null; mentorNombre: string | null } | null, mentor: MentorDeLasConsultas): boolean {
  if (!quien) return false;
  if (mentor.grupoIds.length > 0) return !!quien.grupoId && mentor.grupoIds.includes(quien.grupoId);
  return !!quien.mentorNombre && igualSinMayusculas(quien.mentorNombre, mentor.nombre);
}
