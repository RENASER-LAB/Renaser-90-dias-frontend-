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

/**
 * GET /api/v1/evidence?tipoDestino=ROCA_DIARIA — evidencias de ROCAS ya subidas.
 *
 * Acotado a rocas el 2026-09-05 (D-113). Antes pedía el listado entero y de ahí salían dos cosas:
 * qué hábitos tenían evidencia y qué rocas la tenían. Lo de los hábitos ya no se reconstruye acá —
 * lo publica el backend en `tieneEvidencia` de cada track de `GET /api/v1/habit-tracks/today` —,
 * así que traer la evidencia de hábito y la de espíritu era ocupar la página con filas que nadie
 * mira.
 *
 * **Lo que este filtro NO arregla, y conviene saberlo antes de tocar esto:** la respuesta sigue
 * siendo UNA página de 20 filas, ordenada por fecha de creación descendente y **sin filtro de
 * día**, y `nextCursor` se sigue ignorando. Con una roca por día y sus evidencias, esas 20 filas
 * cubren varias semanas hacia atrás, así que la roca de hoy entra con holgura; pero es una
 * holgura, no una garantía. La solución de fondo es la misma que se aplicó a los hábitos —
 * publicar el dato por roca en `GET /api/v1/rocks/today` — y quedó fuera del alcance de D-113 por
 * decisión explícita.
 */
export async function obtenerEvidenciasDeRocas(): Promise<EvidenciaApi[]> {
  const r = await apiFetch<unknown>('/api/v1/evidence?tipoDestino=ROCA_DIARIA');
  return validarRespuesta(trainingSchemas.evidencePage, r, 'GET /api/v1/evidence').evidencias;
}
