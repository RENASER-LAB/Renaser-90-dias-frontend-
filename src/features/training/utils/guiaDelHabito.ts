/**
 * La guía de un hábito, tal como la trae cada registro de `GET /habit-tracks/today` (`guia`), lista para dibujar
 * en la hoja del hábito (spec 014). Las guías las carga el equipo en el panel (`/admin/habits/{id}/guides`).
 *
 * El servidor manda `{ mantraTitulo, mantraIntro, queHacer, comoHacerlo }` (`GuiaResumenResponse`), todos
 * opcionales; el esquema de la app deja el campo en `unknown` a propósito, así que acá se lee con tolerancia: lo
 * que no sea texto o venga vacío se descarta, y sin nada que mostrar la guía es `null` (y la sección ni aparece).
 */

export interface SeccionDeLaGuia {
  /** El rótulo de la sección («Qué hacer»). */
  titulo: string;
  texto: string;
}

export interface GuiaDelHabito {
  secciones: SeccionDeLaGuia[];
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.replace(/\r\n/g, '\n').trim();
  return limpio.length > 0 ? limpio : null;
}

export function guiaDelHabito(crudo: unknown): GuiaDelHabito | null {
  if (crudo == null || typeof crudo !== 'object' || Array.isArray(crudo)) return null;
  const g = crudo as Record<string, unknown>;
  const secciones: SeccionDeLaGuia[] = [];

  const queHacer = texto(g.queHacer);
  if (queHacer) secciones.push({ titulo: 'Qué hacer', texto: queHacer });
  const comoHacerlo = texto(g.comoHacerlo);
  if (comoHacerlo) secciones.push({ titulo: 'Cómo hacerlo', texto: comoHacerlo });
  // El mantra: su título es el rótulo y su introducción el texto. Solo el título, o solo la introducción, también valen.
  const mantraTitulo = texto(g.mantraTitulo);
  const mantraIntro = texto(g.mantraIntro);
  if (mantraTitulo && mantraIntro) secciones.push({ titulo: mantraTitulo, texto: mantraIntro });
  else if (mantraIntro) secciones.push({ titulo: 'Mantra', texto: mantraIntro });
  else if (mantraTitulo) secciones.push({ titulo: 'Mantra', texto: mantraTitulo });

  return secciones.length > 0 ? { secciones } : null;
}
