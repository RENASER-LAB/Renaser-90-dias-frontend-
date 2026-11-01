import { useEffect, useMemo, useRef, useState } from 'react';

import { leerHabitosDelPrograma } from '../../admin/api/habitosProgramaApi';
import { useFormacionDeLaComunidad } from '../../formaciones/hooks/useFormacionDeLaComunidad';
import * as habitsApi from '../../habits/api/habitsApi';
import { tablasQueSeOfrecen } from '../utils/tablasQueSeOfrecen';

/**
 * Las pestañas del ranking que se ofrecen en la formación que se está mirando (spec 023).
 *
 * - Quien ve todas las formaciones y lee «Todas»: las cuatro (cada sección del ranking nombra su formación; el hábito puede faltar en alguna).
 * - Quien ve todas y eligió una: el catálogo de ESA formación (`GET /admin/habits?formation=`), solo los activos.
 * - Las demás cuentas: su propio catálogo (`GET /habits`), que ya es el de su formación.
 *
 * Se lee una sola vez, cuando la sección Ranking se abre (`activo`); si el pedido falla, sin red o con un servidor anterior, quedan las cuatro:
 * nunca se esconde una pestaña por no saber.
 */
export function useTablasDelRanking(activo: boolean) {
  const { veTodas, eleccion } = useFormacionDeLaComunidad();
  const [claves, setClaves] = useState<ReadonlyArray<string | null | undefined> | null>(null);
  const yaPidio = useRef(false);

  useEffect(() => {
    if (!activo || yaPidio.current) return;
    if (veTodas && !eleccion) return;
    yaPidio.current = true;
    let vigente = true;
    const lectura =
      veTodas && eleccion
        ? leerHabitosDelPrograma(null, eleccion).then(habitos => habitos.filter(h => h.isActive).map(h => h.systemKey))
        : habitsApi.obtenerCatalogo().then(habitos => habitos.map(h => h.systemKey));
    lectura
      .then(leidas => {
        if (vigente) setClaves(leidas);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [activo, veTodas, eleccion]);

  return useMemo(() => tablasQueSeOfrecen(claves), [claves]);
}
