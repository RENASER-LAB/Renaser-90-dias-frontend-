import { useCallback, useEffect, useRef, useState } from 'react';
import * as rankingApi from '../api/rankingApi';
import type { RankingAgregadoDto } from '../api/rankingApi';
import { mensajeDeError } from '../../../services/http/apiClient';

/**
 * Hook para consultar el ranking real desde el backend Java (GET /api/v1/ranking).
 * Provee estado de carga, errores y datos agregados (general, coherencia, liga y célula).
 */
export function useRanking(activo = true) {
  // `activo` (V-3, 26/09/2026): Comunidad lo pasa en `false` hasta que se abre la sección que
  // usa esto, para que no compita con el Muro al abrir. Una vez pedido no se vuelve a pedir solo.
  const [rankingData, setRankingData] = useState<RankingAgregadoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rankingApi.obtenerRankingAgregado();
      setRankingData(data);
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar el ranking.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const yaPidio = useRef(false);
  useEffect(() => {
    if (!activo || yaPidio.current) return;
    yaPidio.current = true;
    void recargar();
  }, [activo, recargar]);

  return {
    rankingData,
    loading,
    error,
    recargar,
  };
}
