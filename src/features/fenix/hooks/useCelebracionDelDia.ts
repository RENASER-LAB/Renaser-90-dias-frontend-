import { useCallback, useEffect, useState } from 'react';

import { celebradorDelCentro } from '../estado/celebracionEnElCentro';
import { tomarCelebracionDeHoy } from '../estado/celebracionDelDia';
import type { DatosDelDia, HitoDelFenix } from '../utils/hitosDelFenix';

/**
 * Celebra los hitos del día que trae `/home` (al volver a Hoy después de cumplir el último hábito, por ejemplo),
 * respetando el tope de una por día. Si el fénix vivo del centro de Hoy está (`celebracionEnElCentro`), salta ÉL y
 * el hook no devuelve nada; si no, devuelve el hito para la superposición `CelebracionFenix`. `terminar` la saca.
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
        if (!vivo || !nuevo) return;
        const centro = celebradorDelCentro();
        if (centro) void centro();
        else setHito(nuevo);
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
