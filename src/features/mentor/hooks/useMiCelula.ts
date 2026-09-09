import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { esDeRed, esNoDisponible, esProhibido, obtenerMiCelula } from '../api/mentorApi';
import { repartirAlumnos, resumenDe } from '../reglas';
import type { MiCelula } from '../types/mentor.types';

/**
 * Por qué no hay datos. Los cuatro se arreglan de forma distinta, así que la pantalla los
 * dice distinto en vez de colapsarlos en "algo salió mal":
 *
 * - `no_disponible` — el endpoint todavía no está desplegado (404). No es culpa de nadie que
 *   esté usando la app, y no tiene sentido ofrecer "reintentar".
 * - `sin_permiso` — 403. El backend no reconoce a esta persona como mentor de esa célula.
 * - `sin_red` — no hubo respuesta. Reintentar sí sirve.
 * - `error` — cualquier otra cosa, incluida una respuesta con forma inesperada.
 */
export type FalloCelula = 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error';

export function useMiCelula(activo: boolean) {
  const [datos, setDatos] = useState<MiCelula | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [fallo, setFallo] = useState<FalloCelula | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!activo) return;
    setCargando(true);
    setFallo(null);
    setDetalle(null);
    try {
      setDatos(await obtenerMiCelula());
    } catch (e) {
      setDatos(null);
      setFallo(
        esNoDisponible(e) ? 'no_disponible'
        : esProhibido(e) ? 'sin_permiso'
        : esDeRed(e) ? 'sin_red'
        : 'error',
      );
      setDetalle(e instanceof Error ? e.message : null);
    } finally {
      setCargando(false);
    }
  }, [activo]);

  /* Se recarga al volver a la pantalla, no solo al montarla: un mentor entra, escribe a
     alguien y vuelve, y espera ver el cambio. Igual que `useUltimaPublicacionMuro`. */
  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  /* El reparto y el resumen se derivan de los datos, no se guardan en estado: un estado
     paralelo es lo que hace que la cabecera diga 8 activos y la lista muestre 7. */
  const vista = useMemo(() => {
    if (!datos) return null;
    const reparto = repartirAlumnos(datos.alumnos);
    return { ...reparto, resumen: resumenDe(reparto.todos), celula: datos.celula };
  }, [datos]);

  return { vista, cargando, fallo, detalle, recargar };
}
