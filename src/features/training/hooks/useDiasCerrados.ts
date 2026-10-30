import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { obtenerDiaCerrado } from '../api/diaCerradoApi';
import type { TrackDelDiaApi } from '../../habits/types/habits.types';
import {
  crearLecturaDeDiasCerrados,
  type LecturaDeDiasCerrados,
  type LecturaDelDia,
} from '../utils/lecturaDeDiasCerrados';

/**
 * La memoria de la SESIÓN: una sola para toda la app, no una por pantalla. Training se vuelve a dibujar cada vez que
 * recupera el foco, y la lectura de un día cerrado —que no cambia— tiene que sobrevivir a eso (condición del dueño:
 * «una lectura por fecha y por cuenta, guardada en memoria durante la sesión»). Cambiar de cuenta o de semana la limpia.
 */
let memoriaDeLaSesion: LecturaDeDiasCerrados | null = null;
function laMemoriaDeLaSesion(): LecturaDeDiasCerrados {
  if (memoriaDeLaSesion === null) memoriaDeLaSesion = crearLecturaDeDiasCerrados(obtenerDiaCerrado);
  return memoriaDeLaSesion;
}

/**
 * Los días anteriores de la semana, leídos del servidor SOLO cuando la persona toca uno (spec 014).
 *
 * Este hook no pide nada por sí mismo: ni al montarse, ni al volver al foco, ni cuando cambia algo al dibujar.
 * Devuelve `pedir(fecha)`, que lo llama el toque en un día de la pastilla de la semana, y `estadoDe(fecha)`. La
 * memoria (una lectura por fecha y por cuenta, el pedido en vuelo compartido, el error que no se reintenta solo)
 * es `crearLecturaDeDiasCerrados`; cambiar `cuentaId` o `semana` la limpia.
 *
 * `leer` es la red: solo las pruebas lo pasan, y entonces la memoria es propia del hook.
 */
export function useDiasCerrados({
  cuentaId,
  semana,
  leer,
}: {
  cuentaId: string;
  /** El lunes de la semana que se mira: cambia con la semana, y con él se limpia la memoria. */
  semana: string;
  leer?: (fecha: string) => Promise<TrackDelDiaApi[] | null>;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lectura = useMemo(() => (leer ? crearLecturaDeDiasCerrados(leer) : laMemoriaDeLaSesion()), []);
  // Idempotente: solo limpia si cambió la cuenta o la semana. No pide nada.
  lectura.alinear(cuentaId, semana);

  const [, redibujar] = useReducer((n: number) => n + 1, 0);
  useEffect(() => lectura.suscribir(redibujar), [lectura]);

  const pedir = useCallback(
    (fecha: string, opciones?: { reintentar?: boolean }) => lectura.pedir(fecha, opciones),
    [lectura],
  );
  const estadoDe = useCallback((fecha: string): LecturaDelDia | undefined => lectura.estadoDe(fecha), [lectura]);

  return { pedir, estadoDe };
}
