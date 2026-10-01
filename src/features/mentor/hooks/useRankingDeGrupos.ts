import { useCallback, useEffect, useRef, useState } from 'react';

import { esNoDisponible, obtenerRankingDeGrupos } from '../api/mentorApi';
import type { RankingGruposApi } from '../api/mentorSchemas';
import { mesDelRanking, type MesDelRanking } from '../utils/mesDelRanking';

/**
 * Dónde está mi grupo entre los de su cohorte: este mes, o cómo terminó el anterior.
 *
 * Devuelve la fila del grupo propio ya localizada, además de la lista completa: es lo que la
 * pantalla del mentor muestra primero, y buscarla en cada render sería trabajo repetido.
 *
 * `disponible` habla del ENDPOINT (un 404 lo apaga), no de si el grupo figura: en el mes anterior
 * un grupo nuevo puede no estar, y eso se dice en vez de esconder el selector de meses.
 */
export function useRankingDeGrupos(cohorteId: string | null, grupoId: string | null, cual: MesDelRanking = 'actual') {
  const [ranking, setRanking] = useState<RankingGruposApi | null>(null);
  const [disponible, setDisponible] = useState(true);
  // Solo la última petición escribe: tocar «Mes anterior» y volver rápido no deja el mes equivocado.
  const ultima = useRef(0);

  const cargar = useCallback(async () => {
    if (!cohorteId) return;
    const peticion = ++ultima.current;
    const mes = mesDelRanking(new Date(), cual);
    try {
      const respuesta = await obtenerRankingDeGrupos(cohorteId, mes);
      if (peticion === ultima.current) setRanking(respuesta);
    } catch (e) {
      if (peticion !== ultima.current) return;
      setRanking(null);
      if (esNoDisponible(e)) setDisponible(false);
    }
  }, [cohorteId, cual]);

  useEffect(() => {
    /* Al cambiar de mes o de grupo, lo anterior no se deja a la vista mientras llega lo nuevo:
       mostraría el puesto de otro mes con el rótulo del que se eligió. */
    setRanking(null);
    void cargar();
  }, [cargar]);

  const miFila = ranking?.grupos.find(g => g.grupoId === grupoId) ?? null;
  return {
    ranking,
    miFila,
    total: ranking?.grupos.length ?? 0,
    disponible: disponible && cohorteId !== null,
    recargar: cargar,
  };
}
