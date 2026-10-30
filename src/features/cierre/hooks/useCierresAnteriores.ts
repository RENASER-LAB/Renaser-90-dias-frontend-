import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { obtenerCierreDelDia } from '../api/cierreApi';
import type { CierreDelDia } from '../types/cierre.types';
import { crearLecturaDeCierres, type LecturaDeCierres, type LecturaDelCierre } from '../utils/lecturaDeCierres';

/** La memoria de la SESIÓN, una para toda la app (como `useDiasCerrados`): Training se vuelve a dibujar al volver al foco. */
let memoriaDeLaSesion: LecturaDeCierres | null = null;
function laMemoriaDeLaSesion(): LecturaDeCierres {
  if (memoriaDeLaSesion === null) memoriaDeLaSesion = crearLecturaDeCierres(obtenerCierreDelDia);
  return memoriaDeLaSesion;
}

/**
 * Los cierres de los días anteriores de la semana, leídos SOLO cuando la persona toca uno (spec 017).
 *
 * No pide nada por sí mismo: ni al montarse, ni al volver al foco. Devuelve `pedir(fecha)` —el toque en un día de la
 * fila de la semana— y `estadoDe(fecha)`. Cambiar `cuentaId` o `semana` limpia la memoria.
 */
export function useCierresAnteriores({
  cuentaId,
  semana,
  leer,
}: {
  cuentaId: string;
  semana: string;
  leer?: (fecha: string) => Promise<CierreDelDia>;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lectura = useMemo(() => (leer ? crearLecturaDeCierres(leer) : laMemoriaDeLaSesion()), []);
  lectura.alinear(cuentaId, semana);

  const [, redibujar] = useReducer((n: number) => n + 1, 0);
  useEffect(() => lectura.suscribir(redibujar), [lectura]);

  const pedir = useCallback(
    (fecha: string, opciones?: { reintentar?: boolean }) => lectura.pedir(fecha, opciones),
    [lectura],
  );
  const estadoDe = useCallback((fecha: string): LecturaDelCierre | undefined => lectura.estadoDe(fecha), [lectura]);
  return { pedir, estadoDe };
}
