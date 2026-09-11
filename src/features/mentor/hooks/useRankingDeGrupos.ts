import { useCallback, useEffect, useState } from 'react';

import { esNoDisponible, obtenerRankingDeGrupos } from '../api/mentorApi';
import type { RankingGruposApi } from '../api/mentorSchemas';

/**
 * Dónde está mi grupo entre los de su cohorte, este mes.
 *
 * Devuelve la fila del grupo propio ya localizada, además de la lista completa: es lo que la
 * pantalla del mentor muestra primero, y buscarla en cada render sería trabajo repetido.
 */
export function useRankingDeGrupos(cohorteId: string | null, grupoId: string | null) {
  const [ranking, setRanking] = useState<RankingGruposApi | null>(null);
  const [disponible, setDisponible] = useState(true);

  const cargar = useCallback(async () => {
    if (!cohorteId) return;
    try {
      const ahora = new Date();
      const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
      setRanking(await obtenerRankingDeGrupos(cohorteId, mes));
    } catch (e) {
      setRanking(null);
      if (esNoDisponible(e)) setDisponible(false);
    }
  }, [cohorteId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const miFila = ranking?.grupos.find(g => g.grupoId === grupoId) ?? null;
  return {
    ranking,
    miFila,
    total: ranking?.grupos.length ?? 0,
    disponible: disponible && miFila !== null,
    recargar: cargar,
  };
}
