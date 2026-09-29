import { apiFetch } from '../../../services/http/apiClient';

export interface EntradaRankingDto {
  participanteId: string;
  fullName: string;
  posicion: number;
  puntaje: number;
}

export interface CelulaResumenDto {
  cellId: string;
  cellName: string;
  cohortName: string;
  mentorName: string;
  memberCount: number;
  totalCellsInCohort: number;
}

export interface RankingAgregadoDto {
  fecha: string;
  celula: CelulaResumenDto | null;
  liga: EntradaRankingDto[];
  coherenciaIndividual: EntradaRankingDto[];
  general: EntradaRankingDto[];
  /**
   * D-226 del backend: km acumulados desde el Día 1 (`puntaje` son km). Opcional: un backend
   * anterior no lo manda.
   */
  kilometros?: EntradaRankingDto[];
}

/**
 * Consulta el ranking agregado desde el backend Java (GET /api/v1/ranking).
 * Contiene el ranking general, liga, coherencia individual y el resumen de la célula.
 */
export async function obtenerRankingAgregado(fecha?: string): Promise<RankingAgregadoDto> {
  const query = fecha ? `?fecha=${fecha}` : '';
  return apiFetch<RankingAgregadoDto>(`/api/v1/ranking${query}`);
}
