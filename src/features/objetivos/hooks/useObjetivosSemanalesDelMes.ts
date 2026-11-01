import { useEffect, useMemo, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import * as objetivosApi from '../api/objetivosApi';
import type { EjeObjetivo, RocaMaestraApi, RocaSemanalApi } from '../types/objetivos.types';
import { rocaDelEje } from '../utils/mesDelPrograma';

/**
 * Los objetivos semanales del eje abierto para las semanas de un mes (spec 028, «Planificar mi mes»). Una lectura por semana
 * (`GET /rocks/weekly?semana=N`, la que ya hace Plan), solo mientras la hoja está abierta y solo de las semanas que se piden — las que
 * pasaron, la de ahora y la que se arma hoy; las que no llegaron no se leen, porque no tienen nada.
 *
 * - **Una vez por semana y por apertura**: cambiar de mes y volver no repite el pedido; cerrar la hoja suelta lo leído (al abrir de nuevo
 *   se relee, por si se armó o se revisó una semana mientras tanto).
 * - **Sin parpadeo ni datos de otra apertura**: `deLaSemana` dice `undefined` mientras una semana no se leyó, `null` si se leyó y no
 *   hay objetivo en ese eje. Un fallo de una semana no tumba las demás: esa queda `undefined` (la fila no inventa «Sin objetivo»).
 * - **Un 403 no es un error**: es el estado de quien todavía no tiene sus tres objetivos de 90 días (`ROCKS_LOCKED`); la semana queda
 *   sin objetivo.
 */
export function useObjetivosSemanalesDelMes({
  activo,
  semanas,
  maestras,
  eje,
}: {
  activo: boolean;
  /** Los números de semana que hay que leer. */
  semanas: readonly number[];
  maestras: readonly RocaMaestraApi[];
  eje: EjeObjetivo;
}) {
  const [leidas, setLeidas] = useState<Readonly<Record<number, RocaSemanalApi[]>>>({});
  const clave = semanas.join(',');

  // Cerrada la hoja, se suelta lo leído.
  useEffect(() => {
    if (!activo) setLeidas({});
  }, [activo]);

  useEffect(() => {
    if (!activo) return undefined;
    const faltan = semanas.filter(n => leidas[n] === undefined);
    if (faltan.length === 0) return undefined;
    let vigente = true;
    void Promise.all(
      faltan.map(async numero => {
        try {
          return [numero, await objetivosApi.obtenerRocasSemanales(numero)] as const;
        } catch (e) {
          return [numero, e instanceof ApiError && e.esProhibido ? [] : null] as const;
        }
      }),
    ).then(resultados => {
      if (!vigente) return;
      setLeidas(previas => {
        const siguientes = { ...previas };
        for (const [numero, rocas] of resultados) {
          if (rocas) siguientes[numero] = rocas;
        }
        return siguientes;
      });
    });
    return () => {
      vigente = false;
    };
    // `leidas` entra por la clave: leer una semana no vuelve a pedir las demás.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, clave]);

  /** `undefined` = todavía no se leyó; `null` = se leyó y ese eje no tiene objetivo esa semana. */
  const deLaSemana = useMemo(
    () => (numero: number): RocaSemanalApi | null | undefined => {
      const rocas = leidas[numero];
      return rocas === undefined ? undefined : rocaDelEje(rocas, maestras, eje);
    },
    [leidas, maestras, eje],
  );

  return { deLaSemana };
}
