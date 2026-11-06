import { apiFetch } from '../../../services/http/apiClient';
import { agregarLaFormacion } from '../../formaciones/estado/formacionDeLaComunidad';
import type { OpcionesDeAudiencia, ParteDelCable, ResumenDeAudiencia } from '../types/audiencia.types';
import { leerOpciones, leerResumen, listaDePersonas, type PaginaDePersonas } from './audienciaSchemas';

/**
 * `/api/v1/calendar/audience` (spec 044, contrato §2): qué puede elegir esta cuenta, el buscador de personas y «Llega a N personas». Un servidor
 * anterior responde 404 y la app sigue como antes (solo Administración crea, para todos).
 */

const BASE = '/api/v1/calendar/audience';

export async function obtenerOpciones(formation?: string | null): Promise<OpcionesDeAudiencia> {
  return leerOpciones(await apiFetch<unknown>(agregarLaFormacion(`${BASE}/options`, formation)));
}

export async function buscarPersonas(texto: string, pagina: number, formation?: string | null): Promise<PaginaDePersonas> {
  const q = encodeURIComponent(texto.trim());
  const datos = await apiFetch<unknown>(agregarLaFormacion(`${BASE}/people?q=${q}&page=${pagina}&size=30`, formation));
  return listaDePersonas(datos, pagina);
}

export async function vistaPrevia(partes: ParteDelCable[], formation?: string | null): Promise<ResumenDeAudiencia> {
  const datos = await apiFetch<unknown>(`${BASE}/preview`, { method: 'POST', body: { parts: partes, ...(formation ? { formation } : {}) } });
  return leerResumen(datos) ?? { partes: [], total: 0 };
}
