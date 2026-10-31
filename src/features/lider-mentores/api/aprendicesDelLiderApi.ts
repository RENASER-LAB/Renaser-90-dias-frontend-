import { apiFetch } from '../../../services/http/apiClient';
import type { PaginaDeAprendices } from '../types/aprendicesDelLider.types';
import { leerPaginaDeAprendices } from './aprendicesDelLiderSchemas';

/**
 * «Todos los aprendices» del líder de mentores (2026-10-31): `GET /api/v1/leadership/people?q=&page=0&size=30`. Viene
 * ordenado por nombre; `q` busca por nombre en el servidor, sin tildes ni mayúsculas, así que la app manda el texto tal
 * cual. Quién puede verla lo decide el servidor (403 para otros roles); un backend anterior responde 404. La puerta de
 * cada persona (su semana, su Radar, su tiempo libre y sus cierres) es `/leadership/people/{p}/…`
 * (`cumplimientoDelLiderApi`, con el grupo en `null`).
 */
export const RUTA_DE_LOS_APRENDICES = '/api/v1/leadership/people';

/** Cuántas filas por página (el contrato las pide de a 30). */
export const TAMANO_DE_LA_PAGINA = 30;

export function rutaDeLosAprendices({ q, pagina, tamano }: { q: string; pagina: number; tamano: number }): string {
  return `${RUTA_DE_LOS_APRENDICES}?q=${encodeURIComponent(q)}&page=${pagina}&size=${tamano}`;
}

export async function obtenerAprendicesDelLider({
  q = '',
  pagina = 0,
  tamano = TAMANO_DE_LA_PAGINA,
}: { q?: string; pagina?: number; tamano?: number } = {}): Promise<PaginaDeAprendices> {
  const respuesta = await apiFetch<unknown>(rutaDeLosAprendices({ q: q.trim(), pagina, tamano }));
  return leerPaginaDeAprendices(respuesta, { pagina, tamano }, 'GET /leadership/people');
}
