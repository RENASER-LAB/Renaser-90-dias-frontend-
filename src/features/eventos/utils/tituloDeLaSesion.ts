import type { OpcionesDeAudiencia } from '../types/audiencia.types';
import type { AudienciaDelFormulario } from './audienciaDelFormulario';

/** Spec 053 FR-013: el servidor admite hasta 60 letras en el título de una «Sesión personalizada» (30 en los demás tipos). */
export const MAX_TITULO_PERSONALIZADA = 60;
export const BASE_PERSONALIZADA = 'Sesión personalizada';

const COLOR_EN_PALABRAS = { GREEN: 'verde', YELLOW: 'amarillo', RED: 'rojo' } as const;

/**
 * El título que arma la app para una «Sesión personalizada» (spec 053, FR-013; D2 del dueño): el líder no lo escribe.
 * Una persona → su nombre; un grupo → su nombre; un solo color → «Semáforo verde»; lo demás → «N personas» (el total de «Llega a N»).
 * Sin nada que decir todavía, «Sesión personalizada» a secas. Nunca pasa de 60 letras (el nombre se recorta con «…»).
 */
export function tituloDeLaSesionPersonalizada(audiencia: AudienciaDelFormulario | null, opciones: OpcionesDeAudiencia | undefined, total: number | null): string {
  const cola = colaDelTitulo(audiencia, opciones, total);
  if (!cola) return BASE_PERSONALIZADA;
  const prefijo = `${BASE_PERSONALIZADA} · `;
  const cabe = MAX_TITULO_PERSONALIZADA - prefijo.length;
  return prefijo + (cola.length > cabe ? `${cola.slice(0, cabe - 1).trimEnd()}…` : cola);
}

function colaDelTitulo(a: AudienciaDelFormulario | null, opciones: OpcionesDeAudiencia | undefined, total: number | null): string | null {
  if (!a) return null;
  const sueltas = a.personas.length + a.personal.length;
  const soloPersonas = !a.misAlumnos && !a.mentores && a.grupos.length === 0 && a.colores.length === 0 && !a.todoElPersonal;
  if (soloPersonas && sueltas === 1) return (a.personas[0] ?? a.personal[0]).nombre;
  const soloUnGrupo = sueltas === 0 && !a.misAlumnos && !a.mentores && a.colores.length === 0 && !a.todoElPersonal && a.grupos.length === 1;
  if (soloUnGrupo) return opciones?.grupos.find(g => g.id === a.grupos[0])?.nombre ?? null;
  const soloUnColor = sueltas === 0 && !a.misAlumnos && !a.mentores && a.grupos.length === 0 && !a.todoElPersonal && a.colores.length === 1;
  if (soloUnColor) return `Semáforo ${COLOR_EN_PALABRAS[a.colores[0]]}`;
  if (total !== null && total > 0) return total === 1 ? '1 persona' : `${total} personas`;
  return null;
}
