import { useCallback, useEffect, useState } from 'react';

import { tomarCelebracionDeHoy } from '../estado/celebracionDelDia';
import type { DatosDelDia, HitoDelFenix } from '../utils/hitosDelFenix';

/**
 * El hito que el fénix celebra ahora en Hoy, o `null`. Mira los datos de `/home` cada vez que cambian (al volver a Hoy
 * después de cumplir el último hábito, por ejemplo) y respeta el tope de una por día. `terminar` la saca de pantalla.
 */
export function useCelebracionDelDia(
  usuarioId: string | null | undefined,
  datos: DatosDelDia | null,
): { hito: HitoDelFenix | null; terminar: () => void } {
  const [hito, setHito] = useState<HitoDelFenix | null>(null);
  const racha = datos?.rachaActual ?? null;
  const completados = datos?.habitosHoy?.completados ?? null;
  const total = datos?.habitosHoy?.total ?? null;

  useEffect(() => {
    if (!usuarioId || (racha === null && total === null)) return;
    let vivo = true;
    const habitosHoy = completados === null || total === null ? null : { completados, total };
    tomarCelebracionDeHoy(usuarioId, { rachaActual: racha, habitosHoy }, new Date())
      .then(nuevo => {
        if (vivo && nuevo) setHito(nuevo);
      })
      .catch(() => {
        /* sin almacenamiento no hay celebración */
      });
    return () => {
      vivo = false;
    };
  }, [usuarioId, racha, completados, total]);

  const terminar = useCallback(() => setHito(null), []);
  return { hito, terminar };
}
