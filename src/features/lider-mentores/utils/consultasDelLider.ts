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
