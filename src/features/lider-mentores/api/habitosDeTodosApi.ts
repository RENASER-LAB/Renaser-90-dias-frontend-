import { apiFetch } from '../../../services/http/apiClient';
import type { FiltrosDeLosHabitos, HabitosDeTodos, PersonasDeUnHabito } from '../types/habitosDeTodos.types';
import { leerHabitosDeTodos, leerPersonasDeUnHabito } from './habitosDeTodosSchemas';

/**
 * «Hábitos de todos» del líder de mentores (spec 029). Solo lectura; quién puede verlo lo decide el servidor (403 para mentor,
 * guía, aprendiz, Soporte TI y cuenta suspendida; un backend anterior responde 404). **Las listas no dejan constancia de
 * consulta**; abrir la ficha o una evidencia desde ahí sí, por sus rutas de siempre.
 */
export const RUTA_DE_LOS_HABITOS = '/api/v1/leadership/habits';

/** Cuántas personas por página en la lista de un hábito. */
export const TAMANO_DE_LA_PAGINA_DE_PERSONAS = 30;

function conFiltros(base: string, filtros: FiltrosDeLosHabitos, extra: Record<string, string | number | null> = {}): string {
  const partes: string[] = [];
  const poner = (clave: string, valor: string | number | null | undefined) => {
    if (valor === null || valor === undefined || valor === '') return;
    partes.push(`${clave}=${encodeURIComponent(String(valor))}`);
  };
  poner('date', filtros.fecha);
  poner('group', filtros.grupo);
  poner('formation', filtros.formacion);
  poner('category', filtros.categoria);
  Object.entries(extra).forEach(([clave, valor]) => poner(clave, valor));
  return partes.length > 0 ? `${base}?${partes.join('&')}` : base;
}

export function rutaDeLosHabitosDeTodos(filtros: FiltrosDeLosHabitos): string {
  return conFiltros(RUTA_DE_LOS_HABITOS, filtros);
}

export function rutaDeLasPersonasDeUnHabito(
  habitoId: string,
  filtros: FiltrosDeLosHabitos,
  { q, pagina, tamano }: { q: string; pagina: number; tamano: number },
): string {
  /* La dimensión no se manda: el hábito ya es uno solo. */
  return conFiltros(`${RUTA_DE_LOS_HABITOS}/${encodeURIComponent(habitoId)}/people`, { ...filtros, categoria: null }, {
    q: q.trim() || null,
    page: pagina,
    size: tamano,
  });
}

export async function obtenerHabitosDeTodos(filtros: FiltrosDeLosHabitos): Promise<HabitosDeTodos> {
  const respuesta = await apiFetch<unknown>(rutaDeLosHabitosDeTodos(filtros));
  return leerHabitosDeTodos(respuesta, 'GET /leadership/habits');
}

export async function obtenerPersonasDeUnHabito(
  habitoId: string,
  filtros: FiltrosDeLosHabitos,
  { q = '', pagina = 0, tamano = TAMANO_DE_LA_PAGINA_DE_PERSONAS }: { q?: string; pagina?: number; tamano?: number } = {},
): Promise<PersonasDeUnHabito> {
  const respuesta = await apiFetch<unknown>(rutaDeLasPersonasDeUnHabito(habitoId, filtros, { q, pagina, tamano }));
  return leerPersonasDeUnHabito(respuesta, { pagina, tamano }, 'GET /leadership/habits/{id}/people');
}
