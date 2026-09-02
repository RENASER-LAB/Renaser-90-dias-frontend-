import { apiFetch } from '../../../services/http/apiClient';
import type { EvidenciaApi, RocaDiariaApi } from '../types/training.types';
import { trainingSchemas, validarRespuesta } from './trainingSchemas';

/**
 * Endpoints que alimentan `TrainingScreen`. Los hábitos de las cuatro dimensiones con catálogo
 * vienen de `features/habits`; acá viven solo los dos que Training necesita además: la roca del
 * día (dimensión "Vida y Negocio") y las evidencias ya subidas.
 */

/**
 * GET /api/v1/rocks/today — la roca diaria del aprendiz.
 *
 * Es la fuente de la dimensión "Vida y Negocio": esa dimensión NO se llena con hábitos del
 * catálogo, sino con el objetivo diario de "Diseñar libertad financiera", que en el backend está
 * modelado como roca (eje `TRABAJO`). Devolver `[]` es un estado legítimo — significa que el
 * aprendiz todavía no planificó su roca de hoy, no que algo falló.
 */
export async function obtenerRocasDeHoy(): Promise<RocaDiariaApi[]> {
  const r = await apiFetch<unknown>('/api/v1/rocks/today');
  return validarRespuesta(trainingSchemas.rocasDeHoy, r, 'GET /api/v1/rocks/today');
}

/** GET /api/v1/evidence — evidencias ya subidas, para saber qué ítems de hoy ya la tienen. */
export async function obtenerEvidencias(): Promise<EvidenciaApi[]> {
  const r = await apiFetch<unknown>('/api/v1/evidence');
  return validarRespuesta(trainingSchemas.evidencePage, r, 'GET /api/v1/evidence').evidencias;
}
