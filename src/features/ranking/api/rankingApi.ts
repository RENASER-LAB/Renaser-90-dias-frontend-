import { apiFetch } from '../../../services/http/apiClient';
import { agregarLaFormacion } from '../../formaciones/estado/formacionDeLaComunidad';

export interface EntradaRankingDto {
  participanteId: string;
  fullName: string;
  posicion: number;
  puntaje: number;
  /**
   * Spec 024: la formación de la fila. Cada formación compara solo a los suyos y `posicion` es DENTRO de su formación. Opcional: un
   * backend anterior no la manda (todo es de la Escuela).
   */
  formation?: string | null;
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
  /** D-266 del backend: días de gimnasio desde el Día 1 (`puntaje` son días). Opcional: un backend anterior no lo manda. */
  gimnasio?: EntradaRankingDto[];
}

/**
 * Consulta el ranking agregado desde el backend Java (GET /api/v1/ranking).
 * Contiene el ranking general, liga, coherencia individual y el resumen de la célula.
 */
export async function obtenerRankingAgregado(fecha?: string, formation?: string | null): Promise<RankingAgregadoDto> {
  const query = fecha ? `?fecha=${fecha}` : '';
  // Spec 024: `formation` solo lo pasa quien ve todas las formaciones y eligió una; sin él, «Todas» (cada fila con la suya).
  return apiFetch<RankingAgregadoDto>(agregarLaFormacion(`/api/v1/ranking${query}`, formation));
}
