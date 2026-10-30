import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import * as objetivosApi from '../api/objetivosApi';
import type { RocaDiariaApi } from '../types/objetivos.types';

/**
 * Las acciones de HOY para «Tus acciones de hoy» de Plan (spec 016): la misma lectura que Hoy y Training ya hacen
 * (`GET /rocks/today`), una sola vez cada vez que Plan vuelve al foco. Así lo que se registró en Training se ve al volver.
 *
 * `rocas` es `null` hasta la primera respuesta. Si una relectura falla se conserva lo último que se leyó y se avisa
 * (`fallo`): quitar de la vista lo que ya se tenía por un problema de red sería castigar a quien no hizo nada.
 */
export function useAccionesDeHoy() {
  const [rocas, setRocas] = useState<RocaDiariaApi[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const consulta = useRef(0);

  const recargar = useCallback(async () => {
    const esta = ++consulta.current;
    try {
      const deHoy = await objetivosApi.obtenerRocasDeHoy();
      if (esta !== consulta.current) return;
      setRocas(deHoy);
      setFallo(false);
    } catch {
      if (esta === consulta.current) setFallo(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  return { rocas, fallo, recargar };
}
